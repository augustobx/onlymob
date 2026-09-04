'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction, requireTenantAdmin } from '@/lib/tenant-guard';

const LEASE_STATUSES = ['DRAFT','CURRENT','EXPIRING','RENEWED','TERMINATED','CANCELED'] as const;

function optionalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error('Fecha inválida.');
  return date;
}

export async function getProfessionalLeaseDataAction() {
  const { tenant } = await requireTenantAdmin();
  const [leases, guarantors] = await Promise.all([
    platformPrisma.propertyLease.findMany({
      where: { tenantId: tenant.id },
      include: {
        property: { select: { id: true, code: true, address: true } },
        renter: { select: { firstName: true, lastName: true, dni: true } },
        guarantor: { select: { id: true, firstName: true, lastName: true, documentNumber: true, phone: true } },
      },
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
    }),
    platformPrisma.contact.findMany({
      where: { tenantId: tenant.id, archivedAt: null, isActive: true },
      select: { id: true, firstName: true, lastName: true, documentNumber: true, phone: true, roles: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
  ]);

  return {
    leases: leases.map((lease) => ({
      id: lease.id,
      propertyId: lease.propertyId,
      propertyCode: lease.property.code,
      propertyAddress: lease.property.address,
      renterName: `${lease.renter.firstName} ${lease.renter.lastName}`,
      renterDni: lease.renter.dni,
      startDate: lease.startDate,
      endDate: lease.endDate,
      extensionUntil: lease.extensionUntil,
      currentRent: Number(lease.currentRent),
      deposit: Number(lease.deposit),
      updatePeriodMonths: lease.updatePeriodMonths,
      adjustmentMethod: lease.adjustmentMethod,
      adjustmentIndex: lease.adjustmentIndex,
      nextAdjustmentDate: lease.nextAdjustmentDate,
      guaranteeType: lease.guaranteeType,
      guaranteeDetails: lease.guaranteeDetails,
      guarantorContactId: lease.guarantorContactId,
      guarantor: lease.guarantor,
      renewalReference: lease.renewalReference,
      inventoryNotes: lease.inventoryNotes,
      status: lease.status,
      notes: lease.notes,
    })),
    guarantors: guarantors.map((contact) => ({
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
      documentNumber: contact.documentNumber,
      phone: contact.phone,
      isGuarantor: contact.roles.some((role) => role.role === 'GUARANTOR'),
    })),
  };
}

export async function updatePropertyLeaseProfessionalAction(data: {
  leaseId: string;
  guarantorContactId?: string | null;
  extensionUntil?: string | null;
  adjustmentMethod?: string;
  adjustmentIndex?: string | null;
  nextAdjustmentDate?: string | null;
  guaranteeType?: string | null;
  guaranteeDetails?: string | null;
  renewalReference?: string | null;
  inventoryNotes?: string | null;
  status?: typeof LEASE_STATUSES[number];
  notes?: string | null;
}) {
  const { tenant, session } = await requireTenantAdmin();
  const lease = await platformPrisma.propertyLease.findFirst({ where: { id: data.leaseId, tenantId: tenant.id } });
  if (!lease) throw new Error('Contrato no encontrado.');

  let guarantorId: string | null = null;
  if (data.guarantorContactId) {
    const guarantor = await platformPrisma.contact.findFirst({ where: { id: data.guarantorContactId, tenantId: tenant.id, archivedAt: null } });
    if (!guarantor) throw new Error('El garante no pertenece a esta inmobiliaria.');
    guarantorId = guarantor.id;
  }

  const extensionUntil = optionalDate(data.extensionUntil);
  const nextAdjustmentDate = optionalDate(data.nextAdjustmentDate);
  if (extensionUntil && extensionUntil <= lease.endDate) throw new Error('La prórroga debe ser posterior al vencimiento original.');

  await platformPrisma.$transaction(async (tx) => {
    await tx.propertyLease.update({
      where: { id: lease.id },
      data: {
        guarantorContactId: guarantorId,
        extensionUntil,
        adjustmentMethod: data.adjustmentMethod?.trim().slice(0, 40) || 'FIXED_PERCENT',
        adjustmentIndex: data.adjustmentIndex?.trim().slice(0, 40) || null,
        nextAdjustmentDate,
        guaranteeType: data.guaranteeType?.trim().slice(0, 80) || null,
        guaranteeDetails: data.guaranteeDetails?.trim() || null,
        renewalReference: data.renewalReference?.trim().slice(0, 120) || null,
        inventoryNotes: data.inventoryNotes?.trim() || null,
        status: data.status || lease.status,
        notes: data.notes?.trim() || lease.notes,
      },
    });

    if (guarantorId) {
      const role = await tx.contactRole.findUnique({ where: { contactId_role: { contactId: guarantorId, role: 'GUARANTOR' } } });
      if (!role) await tx.contactRole.create({ data: { contactId: guarantorId, role: 'GUARANTOR' } });
    }
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'PROPERTY_LEASE_PROFESSIONAL_UPDATED',
    entityType: 'PropertyLease',
    entityId: lease.id,
    metadata: { guarantorContactId: guarantorId, adjustmentMethod: data.adjustmentMethod, status: data.status },
  });

  revalidatePath('/contratos');
  revalidatePath('/dashboard');
  return { success: true };
}
