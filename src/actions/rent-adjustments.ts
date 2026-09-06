'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';
import { auditTenantAction } from '@/lib/tenant-guard';
import {
  applyScheduledRentAdjustments,
  getAutomaticAdjustmentSettings,
  leaseAutoSettingKey,
  previewScheduledRentAdjustments,
} from '@/lib/rent-adjustment-engine';

function atNoon(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
}

function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1, 12, 0, 0, 0);
}

function addMonthsClamped(value: Date, months: number) {
  const source = atNoon(value);
  const targetYear = source.getFullYear();
  const targetMonth = source.getMonth() + months;
  const lastDay = new Date(targetYear, targetMonth + 1, 0, 12, 0, 0, 0).getDate();
  return new Date(targetYear, targetMonth, Math.min(source.getDate(), lastDay), 12, 0, 0, 0);
}

function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: Date) {
  const text = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function inferNextAdjustment(lease: {
  startDate: Date;
  nextAdjustmentDate: Date | null;
  updatePeriodMonths: number;
  rentHistory: Array<{ changeDate: Date }>;
}) {
  if (lease.nextAdjustmentDate) return { date: atNoon(lease.nextAdjustmentDate), inferred: false };

  const period = Math.max(1, Number(lease.updatePeriodMonths || 4));
  const latestChange = lease.rentHistory[0]?.changeDate;
  if (latestChange) return { date: addMonthsClamped(latestChange, period), inferred: true };

  let candidate = addMonthsClamped(lease.startDate, period);
  const currentMonth = monthStart(new Date());
  while (candidate < currentMonth) candidate = addMonthsClamped(candidate, period);
  return { date: candidate, inferred: true };
}

export async function getRentAdjustmentScheduleAction() {
  const { tenant } = await requirePermission('leases', 'read');

  const leases = await platformPrisma.propertyLease.findMany({
    where: {
      tenantId: tenant.id,
      status: { in: ['CURRENT', 'EXPIRING'] },
    },
    select: {
      id: true,
      propertyId: true,
      startDate: true,
      endDate: true,
      extensionUntil: true,
      currentRent: true,
      updatePeriodMonths: true,
      adjustmentMethod: true,
      adjustmentIndex: true,
      nextAdjustmentDate: true,
      status: true,
      property: { select: { code: true, address: true, currency: true } },
      renter: { select: { id: true, firstName: true, lastName: true, dni: true } },
      rentHistory: {
        select: { changeDate: true, oldRent: true, newRent: true, percent: true, indexUsed: true },
        orderBy: { changeDate: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ nextAdjustmentDate: 'asc' }, { endDate: 'asc' }],
  });

  const autoSettings = await getAutomaticAdjustmentSettings(tenant.id, leases.map((lease) => lease.id));
  const today = atNoon(new Date());
  const firstMonth = monthStart(today);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = addMonthsClamped(firstMonth, index);
    return {
      key: monthKey(date),
      label: monthLabel(date),
      count: 0,
      totalRent: 0,
    };
  });

  const items = leases.map((lease) => {
    const next = inferNextAdjustment(lease);
    const dueDate = next.date;
    const daysUntil = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
    const effectiveEndDate = lease.extensionUntil || lease.endDate;
    const lastIncrease = lease.rentHistory[0] || null;

    return {
      leaseId: lease.id,
      propertyId: lease.propertyId,
      propertyCode: lease.property.code,
      propertyAddress: lease.property.address,
      currency: lease.property.currency || 'ARS',
      renterId: lease.renter.id,
      renterName: `${lease.renter.firstName} ${lease.renter.lastName}`.trim(),
      renterDni: lease.renter.dni,
      currentRent: Number(lease.currentRent),
      dueDate: dueDate.toISOString(),
      dueMonth: monthKey(dueDate),
      daysUntil,
      isOverdue: dueDate < today,
      inferred: next.inferred,
      updatePeriodMonths: lease.updatePeriodMonths,
      adjustmentMethod: lease.adjustmentMethod,
      adjustmentIndex: lease.adjustmentIndex,
      autoAdjustmentEnabled: autoSettings.enabledLeaseIds.has(lease.id),
      contractEndDate: effectiveEndDate.toISOString(),
      status: lease.status,
      lastIncrease: lastIncrease
        ? {
            date: lastIncrease.changeDate.toISOString(),
            oldRent: Number(lastIncrease.oldRent),
            newRent: Number(lastIncrease.newRent),
            percent: lastIncrease.percent == null ? null : Number(lastIncrease.percent),
            indexUsed: lastIncrease.indexUsed,
          }
        : null,
    };
  });

  const overdue = { key: 'atrasados', label: 'Atrasados', count: 0, totalRent: 0 };

  for (const item of items) {
    if (item.isOverdue) {
      overdue.count += 1;
      overdue.totalRent += item.currentRent;
      continue;
    }
    const bucket = months.find((entry) => entry.key === item.dueMonth);
    if (bucket) {
      bucket.count += 1;
      bucket.totalRent += item.currentRent;
    }
  }

  return { overdue, months, items, globalAutoEnabled: autoSettings.globalEnabled };
}

export async function previewRentAdjustmentBatchAction(leaseIds: string[], manualPercent?: number | null) {
  const { tenant } = await requirePermission('leases', 'read');
  return previewScheduledRentAdjustments({ tenantId: tenant.id, leaseIds, manualPercent });
}

export async function applyRentAdjustmentBatchAction(leaseIds: string[], manualPercent?: number | null) {
  const { tenant, session } = await requirePermission('leases', 'update');
  const result = await applyScheduledRentAdjustments({ tenantId: tenant.id, leaseIds, manualPercent });

  for (const row of result.applied) {
    await auditTenantAction({
      tenantId: tenant.id,
      actorUserId: session.userId,
      action: 'LEASE_INCREASE_APPLIED',
      entityType: 'PropertyLease',
      entityId: row.leaseId,
      metadata: {
        propertyId: row.propertyId,
        adjustmentMethod: row.adjustmentMethod,
        oldRent: row.oldRent,
        newRent: row.newRent,
        percent: row.percent,
        indexUsed: row.indexUsed,
        nextAdjustmentDate: row.nextAdjustmentDate,
        source: 'bulk-adjustments',
      },
    });
    revalidatePath(`/propiedades/${row.propertyId}`);
    revalidatePath(`/contratos/${row.leaseId}`);
  }

  revalidatePath('/aumentos');
  revalidatePath('/contratos');
  revalidatePath('/propiedades');
  revalidatePath('/dashboard');

  return {
    appliedCount: result.applied.length,
    skippedCount: result.skipped.length,
    applied: result.applied,
    skipped: result.skipped,
  };
}

export async function setLeaseAutomaticAdjustmentAction(leaseId: string, enabled: boolean) {
  const { tenant, session } = await requirePermission('leases', 'update');
  const lease = await platformPrisma.propertyLease.findFirst({
    where: { id: leaseId, tenantId: tenant.id },
    select: {
      id: true,
      propertyId: true,
      adjustmentMethod: true,
      increasePercent: true,
      status: true,
    },
  });
  if (!lease) throw new Error('Contrato no encontrado.');
  if (enabled && !['ICL', 'FIXED_PERCENT'].includes(lease.adjustmentMethod)) {
    throw new Error('El aumento automático solo se puede activar para contratos ICL o porcentaje fijo.');
  }
  if (enabled && lease.adjustmentMethod === 'FIXED_PERCENT' && Number(lease.increasePercent || 0) <= 0) {
    throw new Error('Configurá primero un porcentaje fijo válido en el contrato.');
  }

  await platformPrisma.tenantSetting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: leaseAutoSettingKey(lease.id) } },
    update: { value: enabled ? 'true' : 'false' },
    create: { tenantId: tenant.id, key: leaseAutoSettingKey(lease.id), value: enabled ? 'true' : 'false' },
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: enabled ? 'LEASE_AUTO_ADJUSTMENT_ENABLED' : 'LEASE_AUTO_ADJUSTMENT_DISABLED',
    entityType: 'PropertyLease',
    entityId: lease.id,
    metadata: { propertyId: lease.propertyId, adjustmentMethod: lease.adjustmentMethod },
  });

  revalidatePath(`/contratos/${lease.id}`);
  revalidatePath('/contratos');
  revalidatePath('/aumentos');
  return { success: true, enabled };
}
