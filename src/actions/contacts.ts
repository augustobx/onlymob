'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction, requireTenantAdmin } from '@/lib/tenant-guard';
import { z } from 'zod';

const CONTACT_ROLES = ['PROSPECT','BUYER','RENTAL_PROSPECT','RENTER','OWNER','GUARANTOR','PROVIDER','GENERAL'] as const;

const ContactSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  companyName: z.string().max(160).optional().nullable(),
  documentType: z.string().max(20).optional().nullable(),
  documentNumber: z.string().max(40).optional().nullable(),
  cuit: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().max(50).optional().nullable(),
  alternatePhone: z.string().max(50).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  bankAlias: z.string().max(120).optional().nullable(),
  bankCbu: z.string().max(40).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  roles: z.array(z.enum(CONTACT_ROLES)).min(1).default(['GENERAL']),
});

export async function getContactsAction(search?: string, role?: typeof CONTACT_ROLES[number]) {
  const { tenant } = await requireTenantAdmin();
  return platformPrisma.contact.findMany({
    where: {
      tenantId: tenant.id,
      archivedAt: null,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { companyName: { contains: search } },
              { documentNumber: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
      ...(role ? { roles: { some: { role } } } : {}),
    },
    include: {
      roles: true,
      ownedProperties: { include: { property: true }, orderBy: { isPrimary: 'desc' } },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
}

export async function saveContactAction(data: z.input<typeof ContactSchema> & { id?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  const validated = ContactSchema.parse(data);
  const uniqueRoles = [...new Set(validated.roles)];

  const contact = await platformPrisma.$transaction(async (tx) => {
    const payload = {
      firstName: validated.firstName.trim(),
      lastName: validated.lastName.trim(),
      companyName: validated.companyName?.trim() || null,
      documentType: validated.documentType?.trim() || null,
      documentNumber: validated.documentNumber?.trim() || null,
      cuit: validated.cuit?.trim() || null,
      email: validated.email?.trim().toLowerCase() || null,
      phone: validated.phone?.trim() || null,
      alternatePhone: validated.alternatePhone?.trim() || null,
      address: validated.address?.trim() || null,
      city: validated.city?.trim() || null,
      province: validated.province?.trim() || null,
      postalCode: validated.postalCode?.trim() || null,
      bankAlias: validated.bankAlias?.trim() || null,
      bankCbu: validated.bankCbu?.trim() || null,
      notes: validated.notes?.trim() || null,
    };

    let saved;
    if (data.id) {
      const existing = await tx.contact.findFirst({ where: { id: data.id, tenantId: tenant.id, archivedAt: null } });
      if (!existing) throw new Error('Contacto no encontrado.');
      saved = await tx.contact.update({ where: { id: existing.id }, data: payload });
      await tx.contactRole.deleteMany({ where: { contactId: existing.id } });
    } else {
      saved = await tx.contact.create({ data: { tenantId: tenant.id, ...payload } });
    }

    await tx.contactRole.createMany({
      data: uniqueRoles.map((roleValue) => ({ contactId: saved.id, role: roleValue })),
    });
    return saved;
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: data.id ? 'CONTACT_UPDATED' : 'CONTACT_CREATED',
    entityType: 'Contact',
    entityId: contact.id,
    metadata: { roles: uniqueRoles },
  });

  revalidatePath('/contactos');
  revalidatePath('/propiedades');
  return { success: true, contactId: contact.id };
}

export async function archiveContactAction(contactId: string) {
  const { tenant, session } = await requireTenantAdmin();
  const contact = await platformPrisma.contact.findFirst({
    where: { id: contactId, tenantId: tenant.id, archivedAt: null },
    include: { ownedProperties: true },
  });
  if (!contact) throw new Error('Contacto no encontrado.');
  if (contact.ownedProperties.length > 0) throw new Error('No se puede archivar un contacto que aún figura como propietario.');

  await platformPrisma.contact.update({
    where: { id: contact.id },
    data: { isActive: false, archivedAt: new Date() },
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'CONTACT_ARCHIVED',
    entityType: 'Contact',
    entityId: contact.id,
  });

  revalidatePath('/contactos');
  return { success: true };
}

export async function assignPropertyOwnerAction(data: {
  propertyId: string;
  contactId: string;
  ownershipPercentage?: number;
  isPrimary?: boolean;
  settlementPreference?: string;
  notes?: string;
}) {
  const { tenant, session } = await requireTenantAdmin();
  const percentage = data.ownershipPercentage ?? 100;
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) throw new Error('Porcentaje de titularidad inválido.');

  const owner = await platformPrisma.$transaction(async (tx) => {
    const [property, contact, currentOwners] = await Promise.all([
      tx.property.findFirst({ where: { id: data.propertyId, tenantId: tenant.id, status: { not: 'ARCHIVADO' } } }),
      tx.contact.findFirst({ where: { id: data.contactId, tenantId: tenant.id, archivedAt: null } }),
      tx.propertyOwner.findMany({ where: { propertyId: data.propertyId, tenantId: tenant.id } }),
    ]);
    if (!property) throw new Error('Propiedad no encontrada.');
    if (!contact) throw new Error('Contacto no encontrado.');

    const existing = currentOwners.find((item) => item.contactId === contact.id);
    const otherTotal = currentOwners
      .filter((item) => item.contactId !== contact.id)
      .reduce((sum, item) => sum + Number(item.ownershipPercentage), 0);
    if (otherTotal + percentage > 100.001) throw new Error('La suma de porcentajes de titularidad no puede superar el 100%.');

    const ownerRole = await tx.contactRole.findUnique({
      where: { contactId_role: { contactId: contact.id, role: 'OWNER' } },
    });
    if (!ownerRole) await tx.contactRole.create({ data: { contactId: contact.id, role: 'OWNER' } });

    if (data.isPrimary) {
      await tx.propertyOwner.updateMany({
        where: { propertyId: property.id, tenantId: tenant.id },
        data: { isPrimary: false },
      });
    }

    if (existing) {
      return tx.propertyOwner.update({
        where: { id: existing.id },
        data: {
          ownershipPercentage: percentage,
          isPrimary: !!data.isPrimary,
          settlementPreference: data.settlementPreference?.trim() || null,
          notes: data.notes?.trim() || null,
        },
      });
    }

    return tx.propertyOwner.create({
      data: {
        tenantId: tenant.id,
        propertyId: property.id,
        contactId: contact.id,
        ownershipPercentage: percentage,
        isPrimary: !!data.isPrimary,
        settlementPreference: data.settlementPreference?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'PROPERTY_OWNER_ASSIGNED',
    entityType: 'PropertyOwner',
    entityId: owner.id,
    metadata: { propertyId: data.propertyId, contactId: data.contactId, percentage },
  });

  revalidatePath('/contactos');
  revalidatePath('/propiedades');
  revalidatePath(`/propiedades/${data.propertyId}`);
  return { success: true, ownerId: owner.id };
}

export async function removePropertyOwnerAction(ownerId: string) {
  const { tenant, session } = await requireTenantAdmin();
  const owner = await platformPrisma.propertyOwner.findFirst({ where: { id: ownerId, tenantId: tenant.id } });
  if (!owner) throw new Error('Relación de propietario no encontrada.');

  await platformPrisma.propertyOwner.delete({ where: { id: owner.id } });
  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'PROPERTY_OWNER_REMOVED',
    entityType: 'PropertyOwner',
    entityId: owner.id,
    metadata: { propertyId: owner.propertyId, contactId: owner.contactId },
  });

  revalidatePath('/contactos');
  revalidatePath(`/propiedades/${owner.propertyId}`);
  return { success: true };
}
