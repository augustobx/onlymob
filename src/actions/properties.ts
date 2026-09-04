'use server';

import { revalidatePath } from 'next/cache';
import { getTenantPrisma, platformPrisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';
import { z } from 'zod';

const PropertySchema = z.object({
  code: z.string().min(1, 'El código es obligatorio').max(50),
  address: z.string().min(3, 'La dirección es requerida').max(255),
  type: z.enum(['DEPARTAMENTO', 'CASA', 'LOCAL', 'TERRENO', 'OFICINA', 'COCHERA', 'OTRO']),
  rooms: z.number().int().min(0).nullable().optional(),
  sqm: z.number().min(0).nullable().optional(),
  baseRent: z.number().min(0).nullable().optional(),
  expensesShare: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(1000).optional(),
});

export async function getPropertiesAction(filters?: {
  search?: string;
  type?: string;
  status?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const tenant = await resolveTenantContext();
  const prisma = await getTenantPrisma();

  const where: any = { tenantId: tenant.id };

  if (filters?.search) {
    where.OR = [
      { code: { contains: filters.search } },
      { address: { contains: filters.search } },
    ];
  }

  if (filters?.type && filters.type !== 'ALL') {
    where.type = filters.type;
  }

  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }

  const properties = await prisma.property.findMany({
    where,
    include: {
      propertyLeases: {
        where: { status: 'CURRENT' },
        include: {
          renter: true,
          debts: {
            where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
          },
        },
        take: 1,
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
      rooms: p.rooms,
      sqm: p.sqm ? Number(p.sqm) : null,
      baseRent: p.baseRent ? Number(p.baseRent) : null,
      expensesShare: p.expensesShare ? Number(p.expensesShare) : null,
      status: p.status,
      notes: p.notes,
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
  const tenant = await resolveTenantContext();
  const prisma = await getTenantPrisma();

  const property = await prisma.property.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
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
    baseRent: property.baseRent ? Number(property.baseRent) : null,
    expensesShare: property.expensesShare ? Number(property.expensesShare) : null,
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
        payments: d.payments.map((pm) => ({
          ...pm,
          amount: Number(pm.amount),
        })),
      })),
    })),
  };
}

export async function savePropertyAction(data: {
  id?: string;
  code: string;
  address: string;
  type: any;
  rooms?: number | null;
  sqm?: number | null;
  baseRent?: number | null;
  expensesShare?: number | null;
  notes?: string;
}) {
  const tenant = await resolveTenantContext();
  const validated = PropertySchema.parse(data);

  if (data.id) {
    await platformPrisma.property.update({
      where: { id: data.id },
      data: {
        code: validated.code,
        address: validated.address,
        type: validated.type,
        rooms: validated.rooms,
        sqm: validated.sqm,
        baseRent: validated.baseRent,
        expensesShare: validated.expensesShare,
        notes: validated.notes,
      },
    });
  } else {
    await platformPrisma.property.create({
      data: {
        tenantId: tenant.id,
        code: validated.code,
        address: validated.address,
        type: validated.type,
        rooms: validated.rooms,
        sqm: validated.sqm,
        baseRent: validated.baseRent,
        expensesShare: validated.expensesShare,
        notes: validated.notes,
      },
    });
  }

  revalidatePath('/propiedades');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deletePropertyAction(id: string) {
  const tenant = await resolveTenantContext();

  const property = await platformPrisma.property.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      propertyLeases: { where: { status: 'CURRENT' } },
    },
  });

  if (!property) throw new Error('Propiedad no encontrada.');

  if (property.propertyLeases.length > 0) {
    throw new Error('No se puede eliminar una propiedad con contratos vigentes.');
  }

  // Soft-delete / archivar para preservar integridad histórica
  await platformPrisma.property.update({
    where: { id },
    data: { status: 'ARCHIVADO' },
  });

  revalidatePath('/propiedades');
  revalidatePath('/dashboard');
  return { success: true };
}
