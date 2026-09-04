'use server';

import { revalidatePath } from 'next/cache';
import { getTenantPrisma } from '@/lib/prisma';
import { auditTenantAction, requireTenantAdmin } from '@/lib/tenant-guard';
import { z } from 'zod';

const PropertySchema = z.object({
  code: z.string().min(1, 'El código es obligatorio').max(50),
  address: z.string().min(3, 'La dirección es requerida').max(255),
  type: z.enum(['DEPARTAMENTO', 'CASA', 'LOCAL', 'TERRENO', 'OFICINA', 'COCHERA', 'OTRO']),
  operation: z.enum(['RENT', 'SALE', 'TEMPORARY_RENT', 'MANAGEMENT']).optional(),
  commercialStatus: z.enum(['DRAFT', 'AVAILABLE', 'RESERVED', 'UNDER_NEGOTIATION', 'CLOSED', 'PAUSED', 'ARCHIVED']).optional(),
  rooms: z.number().int().min(0).nullable().optional(),
  bedrooms: z.number().int().min(0).nullable().optional(),
  bathrooms: z.number().int().min(0).nullable().optional(),
  sqm: z.number().min(0).nullable().optional(),
  baseRent: z.number().min(0).nullable().optional(),
  rentPrice: z.number().min(0).nullable().optional(),
  salePrice: z.number().min(0).nullable().optional(),
  expenses: z.number().min(0).nullable().optional(),
  expensesShare: z.number().min(0).max(100).nullable().optional(),
  currency: z.string().min(3).max(10).optional(),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
  notes: z.string().max(4000).optional(),
});

export async function getPropertiesAction(filters?: {
  search?: string;
  type?: string;
  status?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const { tenant } = await requireTenantAdmin();
  const prisma = await getTenantPrisma();

  const where: any = { tenantId: tenant.id };

  if (filters?.search) {
    where.OR = [
      { code: { contains: filters.search } },
      { address: { contains: filters.search } },
      { city: { contains: filters.search } },
    ];
  }

  if (filters?.type && filters.type !== 'ALL') where.type = filters.type;
  if (filters?.status && filters.status !== 'ALL') where.status = filters.status;

  const properties = await prisma.property.findMany({
    where,
    include: {
      propertyLeases: {
        where: { status: 'CURRENT' },
        include: {
          renter: true,
          debts: { where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
        },
        take: 1,
      },
      owners: {
        include: { contact: true },
        orderBy: { isPrimary: 'desc' },
      },
    },
    orderBy: { code: filters?.sortDir === 'desc' ? 'desc' : 'asc' },
  });

  return properties.map((p) => {
    const activeLease = p.propertyLeases[0] || null;
    const pendingDebtTotal = activeLease
      ? activeLease.debts.reduce((sum, d) => sum + (Number(d.amount) - Number(d.paidAmount)), 0)
      : 0;

    return {
      id: p.id,
      code: p.code,
      address: p.address,
      type: p.type,
      operation: p.operation,
      commercialStatus: p.commercialStatus,
      rooms: p.rooms,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqm: p.sqm ? Number(p.sqm) : null,
      baseRent: p.baseRent ? Number(p.baseRent) : null,
      rentPrice: p.rentPrice ? Number(p.rentPrice) : null,
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      expenses: p.expenses ? Number(p.expenses) : null,
      expensesShare: p.expensesShare ? Number(p.expensesShare) : null,
      currency: p.currency,
      city: p.city,
      province: p.province,
      status: p.status,
      notes: p.notes,
      owners: p.owners.map((owner) => ({
        id: owner.id,
        contactId: owner.contactId,
        name: `${owner.contact.firstName} ${owner.contact.lastName}`.trim(),
        percentage: Number(owner.ownershipPercentage),
        isPrimary: owner.isPrimary,
      })),
      activeLease: activeLease
        ? {
            id: activeLease.id,
            currentRent: Number(activeLease.currentRent),
            startDate: activeLease.startDate,
            endDate: activeLease.endDate,
            renterName: `${activeLease.renter.firstName} ${activeLease.renter.lastName}`,
            renterPhone: activeLease.renter.phone,
            renterEmail: activeLease.renter.email,
            pendingDebtTotal,
          }
        : null,
    };
  });
}

export async function getPropertyByIdAction(id: string) {
  await requireTenantAdmin();
  const prisma = await getTenantPrisma();

  const property = await prisma.property.findFirst({
    where: { id },
    include: {
      owners: { include: { contact: { include: { roles: true } } }, orderBy: { isPrimary: 'desc' } },
      propertyLeases: {
        orderBy: { createdAt: 'desc' },
        include: {
          renter: true,
          rentHistory: { orderBy: { changeDate: 'desc' } },
          debts: {
            orderBy: { dueDate: 'desc' },
            include: { payments: { orderBy: { paidAt: 'desc' } } },
          },
        },
      },
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  });

  if (!property) return null;

  return {
    ...property,
    sqm: property.sqm ? Number(property.sqm) : null,
    coveredSqm: property.coveredSqm ? Number(property.coveredSqm) : null,
    semiCoveredSqm: property.semiCoveredSqm ? Number(property.semiCoveredSqm) : null,
    landSqm: property.landSqm ? Number(property.landSqm) : null,
    baseRent: property.baseRent ? Number(property.baseRent) : null,
    rentPrice: property.rentPrice ? Number(property.rentPrice) : null,
    salePrice: property.salePrice ? Number(property.salePrice) : null,
    expenses: property.expenses ? Number(property.expenses) : null,
    expensesShare: property.expensesShare ? Number(property.expensesShare) : null,
    commissionPercent: property.commissionPercent ? Number(property.commissionPercent) : null,
    owners: property.owners.map((owner) => ({
      ...owner,
      ownershipPercentage: Number(owner.ownershipPercentage),
    })),
    propertyLeases: property.propertyLeases.map((l) => ({
      ...l,
      currentRent: Number(l.currentRent),
      deposit: Number(l.deposit),
      increasePercent: Number(l.increasePercent),
      rentHistory: l.rentHistory.map((h) => ({
        ...h,
        oldRent: Number(h.oldRent),
        newRent: Number(h.newRent),
        percent: h.percent ? Number(h.percent) : null,
      })),
      debts: l.debts.map((d) => ({
        ...d,
        amount: Number(d.amount),
        paidAmount: Number(d.paidAmount),
        payments: d.payments.map((pm) => ({ ...pm, amount: Number(pm.amount) })),
      })),
    })),
  };
}

export async function savePropertyAction(data: {
  id?: string;
  code: string;
  address: string;
  type: any;
  operation?: any;
  commercialStatus?: any;
  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqm?: number | null;
  baseRent?: number | null;
  rentPrice?: number | null;
  salePrice?: number | null;
  expenses?: number | null;
  expensesShare?: number | null;
  currency?: string;
  city?: string | null;
  province?: string | null;
  notes?: string;
}) {
  const { tenant, session } = await requireTenantAdmin();
  const prisma = await getTenantPrisma();
  const validated = PropertySchema.parse(data);

  const payload = {
    code: validated.code,
    address: validated.address,
    type: validated.type,
    operation: validated.operation,
    commercialStatus: validated.commercialStatus,
    rooms: validated.rooms,
    bedrooms: validated.bedrooms,
    bathrooms: validated.bathrooms,
    sqm: validated.sqm,
    baseRent: validated.baseRent,
    rentPrice: validated.rentPrice ?? validated.baseRent,
    salePrice: validated.salePrice,
    expenses: validated.expenses,
    expensesShare: validated.expensesShare,
    currency: validated.currency,
    city: validated.city,
    province: validated.province,
    notes: validated.notes,
  };

  const property = data.id
    ? await prisma.property.update({ where: { id: data.id }, data: payload })
    : await prisma.property.create({ data: { ...payload, tenantId: tenant.id } });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: data.id ? 'PROPERTY_UPDATED' : 'PROPERTY_CREATED',
    entityType: 'Property',
    entityId: property.id,
    metadata: { code: property.code },
  });

  revalidatePath('/propiedades');
  revalidatePath(`/propiedades/${property.id}`);
  revalidatePath('/dashboard');
  return { success: true, propertyId: property.id };
}

export async function deletePropertyAction(id: string) {
  const { tenant, session } = await requireTenantAdmin();
  const prisma = await getTenantPrisma();

  const property = await prisma.property.findFirst({
    where: { id },
    include: { propertyLeases: { where: { status: 'CURRENT' } } },
  });

  if (!property) throw new Error('Propiedad no encontrada.');
  if (property.propertyLeases.length > 0) {
    throw new Error('No se puede archivar una propiedad con contratos vigentes.');
  }

  await prisma.property.update({
    where: { id },
    data: {
      status: 'ARCHIVADO',
      commercialStatus: 'ARCHIVED',
      archivedAt: new Date(),
    },
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'PROPERTY_ARCHIVED',
    entityType: 'Property',
    entityId: id,
    metadata: { code: property.code },
  });

  revalidatePath('/propiedades');
  revalidatePath('/dashboard');
  return { success: true };
}
