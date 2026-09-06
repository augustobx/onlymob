'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction } from '@/lib/tenant-guard';
import { requirePermission } from '@/lib/permissions';

const ADJUSTMENT_METHODS = ['ICL', 'MANUAL', 'FIXED_PERCENT', 'IPC', 'OTHER'] as const;
type AdjustmentMethod = (typeof ADJUSTMENT_METHODS)[number];
const MANUAL_BULK_METHODS: AdjustmentMethod[] = ['MANUAL', 'FIXED_PERCENT'];

function parseDate(value: string, label: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} inválida.`);
  return date;
}

function addMonths(value: Date, months: number) {
  const result = new Date(value);
  result.setHours(12, 0, 0, 0);
  result.setMonth(result.getMonth() + months);
  return result;
}

function normalizePeriod(value?: number) {
  const period = Math.trunc(Number(value || 4));
  if (![1, 2, 3, 4, 6, 12].includes(period)) throw new Error('La periodicidad del ajuste no es válida.');
  return period;
}

function normalizeAdjustmentMethod(value?: string): AdjustmentMethod {
  const method = String(value || 'ICL').toUpperCase();
  if (!ADJUSTMENT_METHODS.includes(method as AdjustmentMethod)) throw new Error('La modalidad de aumento no es válida.');
  return method as AdjustmentMethod;
}

export async function getLeasesAction() {
  const { tenant } = await requirePermission('leases', 'read');

  const [propertyLeases, garageLeases] = await Promise.all([
    platformPrisma.propertyLease.findMany({
      where: { tenantId: tenant.id },
      include: {
        property: true,
        renter: true,
        debts: { where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    platformPrisma.garageLease.findMany({
      where: { tenantId: tenant.id },
      include: {
        renter: true,
        spaces: { include: { space: { include: { garage: true } } } },
        debts: { where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    propertyLeases: propertyLeases.map((lease) => ({
      id: lease.id,
      propertyId: lease.propertyId,
      propertyCode: lease.property.code,
      propertyAddress: lease.property.address,
      renterId: lease.renterId,
      renterName: `${lease.renter.firstName} ${lease.renter.lastName}`,
      startDate: lease.startDate,
      endDate: lease.endDate,
      currentRent: Number(lease.currentRent),
      deposit: Number(lease.deposit),
      increasePercent: Number(lease.increasePercent),
      updatePeriodMonths: lease.updatePeriodMonths,
      adjustmentMethod: lease.adjustmentMethod,
      adjustmentIndex: lease.adjustmentIndex,
      nextAdjustmentDate: lease.nextAdjustmentDate,
      status: lease.status,
      pendingDebtTotal: lease.debts.reduce((sum, debt) => sum + (Number(debt.amount) - Number(debt.paidAmount)), 0),
    })),
    garageLeases: garageLeases.map((lease) => ({
      id: lease.id,
      renterId: lease.renterId,
      renterName: `${lease.renter.firstName} ${lease.renter.lastName}`,
      startDate: lease.startDate,
      endDate: lease.endDate,
      totalRent: Number(lease.totalRent),
      deposit: Number(lease.deposit),
      increasePercent: Number(lease.increasePercent),
      status: lease.status,
      spacesCount: lease.spaces.length,
      spacesDescription: lease.spaces.map((item) => `#${item.space.spaceNumber}`).join(', '),
      pendingDebtTotal: lease.debts.reduce((sum, debt) => sum + (Number(debt.amount) - Number(debt.paidAmount)), 0),
    })),
  };
}

export async function createPropertyLeaseAction(data: {
  propertyId: string;
  renterId: string;
  startDate: string;
  endDate: string;
  rent: number;
  deposit?: number;
  updatePeriodMonths?: number;
  adjustmentMethod?: AdjustmentMethod | string;
  adjustmentIndex?: string | null;
  nextAdjustmentDate?: string | null;
  notes?: string;
}) {
  const { tenant, session } = await requirePermission('leases', 'create');
  const startDate = parseDate(data.startDate, 'Fecha de inicio');
  const endDate = parseDate(data.endDate, 'Fecha de finalización');
  if (endDate <= startDate) throw new Error('La fecha de finalización debe ser posterior al inicio.');
  if (!Number.isFinite(data.rent) || data.rent <= 0) throw new Error('El alquiler debe ser mayor a cero.');
  const deposit = Number(data.deposit || 0);
  if (!Number.isFinite(deposit) || deposit < 0) throw new Error('El depósito no puede ser negativo.');

  const updatePeriodMonths = normalizePeriod(data.updatePeriodMonths);
  const adjustmentMethod = normalizeAdjustmentMethod(data.adjustmentMethod);
  const explicitNextAdjustment = data.nextAdjustmentDate ? parseDate(data.nextAdjustmentDate, 'Próximo aumento') : null;
  const nextAdjustmentDate = explicitNextAdjustment || addMonths(startDate, updatePeriodMonths);
  const adjustmentIndex = adjustmentMethod === 'ICL'
    ? 'ICL'
    : data.adjustmentIndex?.trim().slice(0, 40) || null;

  const lease = await platformPrisma.$transaction(async (tx) => {
    const [property, renter, activeLease] = await Promise.all([
      tx.property.findFirst({ where: { id: data.propertyId, tenantId: tenant.id, status: { not: 'ARCHIVADO' } } }),
      tx.propertyRenter.findFirst({ where: { id: data.renterId, tenantId: tenant.id, status: 'ACTIVE' } }),
      tx.propertyLease.findFirst({
        where: { tenantId: tenant.id, propertyId: data.propertyId, status: { in: ['CURRENT', 'EXPIRING', 'RENEWED'] } },
      }),
    ]);

    if (!property) throw new Error('Propiedad no encontrada para esta inmobiliaria.');
    if (!renter) throw new Error('Inquilino no encontrado o inactivo.');
    if (activeLease) throw new Error('La propiedad ya tiene un contrato vigente.');

    const created = await tx.propertyLease.create({
      data: {
        tenantId: tenant.id,
        propertyId: property.id,
        renterId: renter.id,
        startDate,
        endDate,
        currentRent: data.rent,
        deposit,
        updatePeriodMonths,
        adjustmentMethod,
        adjustmentIndex,
        nextAdjustmentDate,
        status: 'CURRENT',
        notes: data.notes?.trim() || null,
      },
    });

    await tx.property.update({
      where: { id: property.id },
      data: { status: 'ALQUILADO', commercialStatus: 'CLOSED' },
    });

    return created;
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'PROPERTY_LEASE_CREATED',
    entityType: 'PropertyLease',
    entityId: lease.id,
    metadata: {
      propertyId: data.propertyId,
      renterId: data.renterId,
      adjustmentMethod,
      updatePeriodMonths,
      nextAdjustmentDate: nextAdjustmentDate.toISOString(),
    },
  });

  revalidatePath('/contratos');
  revalidatePath('/aumentos');
  revalidatePath('/propiedades');
  revalidatePath(`/propiedades/${data.propertyId}`);
  revalidatePath('/dashboard');
  return { success: true, leaseId: lease.id };
}

export async function createGarageLeaseAction(data: {
  renterId: string;
  spaceIds: string[];
  startDate: string;
  endDate: string;
  rentPerSpace: number;
  totalRent: number;
  deposit?: number;
  notes?: string;
}) {
  const { tenant, session } = await requirePermission('leases', 'create');
  const startDate = parseDate(data.startDate, 'Fecha de inicio');
  const endDate = parseDate(data.endDate, 'Fecha de finalización');
  const spaceIds = [...new Set(data.spaceIds)];

  if (endDate <= startDate) throw new Error('La fecha de finalización debe ser posterior al inicio.');
  if (spaceIds.length === 0) throw new Error('Seleccioná al menos una plaza.');
  if (!Number.isFinite(data.totalRent) || data.totalRent <= 0) throw new Error('El alquiler total debe ser mayor a cero.');

  const lease = await platformPrisma.$transaction(async (tx) => {
    const renter = await tx.propertyRenter.findFirst({
      where: { id: data.renterId, tenantId: tenant.id, status: 'ACTIVE' },
    });
    if (!renter) throw new Error('Inquilino no encontrado o inactivo.');

    const spaces = await tx.garageSpace.findMany({
      where: { id: { in: spaceIds }, garage: { tenantId: tenant.id } },
      include: {
        leaseSpaces: { where: { lease: { tenantId: tenant.id, status: 'CURRENT' } }, take: 1 },
      },
    });

    if (spaces.length !== spaceIds.length) throw new Error('Una o más plazas no pertenecen a esta inmobiliaria.');
    if (spaces.some((space) => space.status === 'MAINTENANCE' || space.leaseSpaces.length > 0)) {
      throw new Error('Una o más plazas no están disponibles.');
    }

    const created = await tx.garageLease.create({
      data: {
        tenantId: tenant.id,
        renterId: renter.id,
        startDate,
        endDate,
        rentPerSpace: data.rentPerSpace,
        totalRent: data.totalRent,
        deposit: data.deposit || 0,
        status: 'CURRENT',
        notes: data.notes?.trim() || null,
      },
    });

    await tx.garageLeaseSpace.createMany({ data: spaceIds.map((spaceId) => ({ leaseId: created.id, spaceId })) });
    await tx.garageSpace.updateMany({ where: { id: { in: spaceIds } }, data: { status: 'OCCUPIED' } });
    return created;
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'GARAGE_LEASE_CREATED',
    entityType: 'GarageLease',
    entityId: lease.id,
    metadata: { renterId: data.renterId, spaceIds },
  });

  revalidatePath('/contratos');
  revalidatePath('/cocheras');
  revalidatePath('/dashboard');
  return { success: true, leaseId: lease.id };
}

export async function terminateLeaseAction(id: string, type: 'PROPERTY' | 'GARAGE') {
  const { tenant, session } = await requirePermission('leases', 'update');

  await platformPrisma.$transaction(async (tx) => {
    if (type === 'PROPERTY') {
      const lease = await tx.propertyLease.findFirst({
        where: { id, tenantId: tenant.id, status: { in: ['CURRENT', 'EXPIRING'] } },
      });
      if (!lease) throw new Error('Contrato vigente no encontrado.');
      await tx.propertyLease.update({ where: { id: lease.id }, data: { status: 'TERMINATED' } });
      await tx.property.update({
        where: { id: lease.propertyId },
        data: { status: 'DISPONIBLE', commercialStatus: 'AVAILABLE' },
      });
      return;
    }

    const lease = await tx.garageLease.findFirst({
      where: { id, tenantId: tenant.id, status: 'CURRENT' },
      include: { spaces: true },
    });
    if (!lease) throw new Error('Contrato de cochera vigente no encontrado.');
    await tx.garageLease.update({ where: { id: lease.id }, data: { status: 'TERMINATED' } });
    await tx.garageSpace.updateMany({ where: { id: { in: lease.spaces.map((item) => item.spaceId) } }, data: { status: 'FREE' } });
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'LEASE_TERMINATED',
    entityType: type === 'PROPERTY' ? 'PropertyLease' : 'GarageLease',
    entityId: id,
  });

  revalidatePath('/contratos');
  revalidatePath('/aumentos');
  revalidatePath('/propiedades');
  revalidatePath('/cocheras');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Vista previa exclusivamente manual. Los contratos ICL quedan fuera a propósito:
 * su actualización debe calcularse contra la serie oficial desde la ficha individual.
 */
export async function previewIncreaseAction(updatePeriodMonths: number, percent: number) {
  const { tenant } = await requirePermission('leases', 'read');
  if (!Number.isFinite(percent) || percent <= 0 || percent > 1000) throw new Error('Porcentaje inválido.');

  const where: any = {
    tenantId: tenant.id,
    status: { in: ['CURRENT', 'EXPIRING'] },
    adjustmentMethod: { in: MANUAL_BULK_METHODS },
  };
  if (updatePeriodMonths > 0) where.updatePeriodMonths = updatePeriodMonths;

  const leases = await platformPrisma.propertyLease.findMany({
    where,
    include: { property: true, renter: true },
    orderBy: { property: { code: 'asc' } },
  });

  return leases.map((lease) => {
    const oldRent = Number(lease.currentRent);
    const newRent = Math.round(oldRent * (1 + percent / 100) * 100) / 100;
    return {
      leaseId: lease.id,
      propertyCode: lease.property.code,
      renterName: `${lease.renter.firstName} ${lease.renter.lastName}`,
      updatePeriodMonths: lease.updatePeriodMonths,
      adjustmentMethod: lease.adjustmentMethod,
      oldRent,
      newRent,
      diff: newRent - oldRent,
      percent,
    };
  });
}

/** Aplicación masiva manual; nunca modifica contratos configurados como ICL. */
export async function applyIncreaseAction(updatePeriodMonths: number, percent: number, indexUsed = 'Ajuste manual masivo') {
  const { tenant, session } = await requirePermission('leases', 'update');
  if (!Number.isFinite(percent) || percent <= 0 || percent > 1000) throw new Error('Porcentaje inválido.');

  const where: any = {
    tenantId: tenant.id,
    status: { in: ['CURRENT', 'EXPIRING'] },
    adjustmentMethod: { in: MANUAL_BULK_METHODS },
  };
  if (updatePeriodMonths > 0) where.updatePeriodMonths = updatePeriodMonths;

  const now = new Date();
  const count = await platformPrisma.$transaction(async (tx) => {
    const leases = await tx.propertyLease.findMany({ where });
    for (const lease of leases) {
      const oldRent = Number(lease.currentRent);
      const newRent = Math.round(oldRent * (1 + percent / 100) * 100) / 100;
      const nextAdjustmentDate = addMonths(now, normalizePeriod(lease.updatePeriodMonths));
      await tx.rentHistory.create({
        data: {
          propertyLeaseId: lease.id,
          changeDate: now,
          oldRent,
          newRent,
          percent,
          indexUsed: indexUsed.slice(0, 50),
        },
      });
      await tx.propertyLease.update({
        where: { id: lease.id },
        data: { currentRent: newRent, increasePercent: percent, nextAdjustmentDate },
      });
    }
    return leases.length;
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'LEASE_INCREASE_APPLIED',
    entityType: 'PropertyLease',
    metadata: { count, percent, updatePeriodMonths, indexUsed, mode: 'MANUAL_BULK' },
  });

  revalidatePath('/contratos');
  revalidatePath('/aumentos');
  revalidatePath('/propiedades');
  revalidatePath('/dashboard');
  return { success: true, count };
}

export async function generateMonthlyQuotasAction(periodStr: string, dueDay = 10) {
  const { tenant, session } = await requirePermission('collections', 'create');
  if (!/^\d{4}-\d{2}$/.test(periodStr)) throw new Error('Período inválido.');
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) throw new Error('El día de vencimiento debe estar entre 1 y 28.');

  const [yearStr, monthStr] = periodStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (month < 1 || month > 12) throw new Error('Mes inválido.');

  const dueDate = new Date(year, month - 1, dueDay, 12, 0, 0);
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const descPrefix = `Alquiler ${monthNames[month - 1]} ${year}`;

  const createdCount = await platformPrisma.$transaction(async (tx) => {
    let created = 0;
    const [propertyLeases, garageLeases] = await Promise.all([
      tx.propertyLease.findMany({ where: { tenantId: tenant.id, status: { in: ['CURRENT', 'EXPIRING'] } } }),
      tx.garageLease.findMany({ where: { tenantId: tenant.id, status: 'CURRENT' }, include: { spaces: true } }),
    ]);

    for (const lease of propertyLeases) {
      const existing = await tx.debt.findFirst({
        where: { tenantId: tenant.id, propertyLeaseId: lease.id, type: 'ALQUILER', description: descPrefix },
      });
      if (!existing) {
        await tx.debt.create({
          data: {
            tenantId: tenant.id,
            leaseType: 'PROPERTY',
            propertyLeaseId: lease.id,
            renterId: lease.renterId,
            type: 'ALQUILER',
            description: descPrefix,
            amount: lease.currentRent,
            dueDate,
            paidAmount: 0,
            status: 'PENDING',
          },
        });
        created += 1;
      }
    }

    for (const lease of garageLeases) {
      const description = `${descPrefix} (${lease.spaces.length} plaza/s)`;
      const existing = await tx.debt.findFirst({
        where: { tenantId: tenant.id, garageLeaseId: lease.id, type: 'ALQUILER', description },
      });
      if (!existing) {
        await tx.debt.create({
          data: {
            tenantId: tenant.id,
            leaseType: 'GARAGE',
            garageLeaseId: lease.id,
            renterId: lease.renterId,
            type: 'ALQUILER',
            description,
            amount: lease.totalRent,
            dueDate,
            paidAmount: 0,
            status: 'PENDING',
          },
        });
        created += 1;
      }
    }
    return created;
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'MONTHLY_QUOTAS_GENERATED',
    entityType: 'Debt',
    metadata: { period: periodStr, dueDay, createdCount },
  });

  revalidatePath('/cobranzas');
  revalidatePath('/contratos');
  revalidatePath('/dashboard');
  return { success: true, createdCount };
}
