'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';
import { auditTenantAction } from '@/lib/tenant-guard';
import { getLatestOfficialICL, getOfficialICLAtOrBefore } from '@/lib/bcra';

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setMonth(next.getMonth() + months);
  return next;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

async function getLeaseForAdjustment(tenantId: string, leaseId: string) {
  return platformPrisma.propertyLease.findFirst({
    where: {
      id: leaseId,
      tenantId,
      status: { in: ['CURRENT', 'EXPIRING'] },
    },
    select: {
      id: true,
      propertyId: true,
      startDate: true,
      currentRent: true,
      updatePeriodMonths: true,
      increasePercent: true,
      adjustmentIndex: true,
      adjustmentMethod: true,
      rentHistory: { orderBy: { changeDate: 'desc' }, take: 1, select: { changeDate: true } },
    },
  });
}

async function calculateIclAdjustment(lease: Awaited<ReturnType<typeof getLeaseForAdjustment>>) {
  if (!lease) throw new Error('Contrato no encontrado.');
  const baseDate = lease.rentHistory[0]?.changeDate || lease.startDate;
  const [baseIcl, currentIcl] = await Promise.all([
    getOfficialICLAtOrBefore(baseDate),
    getLatestOfficialICL(),
  ]);
  if (!baseIcl || !currentIcl) {
    throw new Error('No se pudo obtener el ICL oficial del BCRA. No se aplicó ningún cambio.');
  }
  if (currentIcl.valor <= 0 || baseIcl.valor <= 0) throw new Error('Los valores ICL recibidos no son válidos.');

  const oldRent = Number(lease.currentRent);
  const factor = currentIcl.valor / baseIcl.valor;
  const newRent = roundMoney(oldRent * factor);
  const percent = Math.round((factor - 1) * 10000) / 100;
  if (!Number.isFinite(newRent) || newRent <= 0 || !Number.isFinite(percent)) {
    throw new Error('No se pudo calcular el aumento por ICL.');
  }

  return {
    oldRent,
    newRent,
    percent,
    baseDate: baseIcl.fecha,
    baseIcl: baseIcl.valor,
    currentDate: currentIcl.fecha,
    currentIcl: currentIcl.valor,
    indexUsed: `ICL ${baseIcl.valor.toFixed(4)} → ${currentIcl.valor.toFixed(4)}`.slice(0, 50),
  };
}

export async function previewPropertyLeaseIncreaseAction(leaseId: string) {
  const { tenant } = await requirePermission('leases', 'read');
  const lease = await getLeaseForAdjustment(tenant.id, leaseId);
  if (!lease) throw new Error('No se encontró un contrato vigente.');

  if (lease.adjustmentMethod === 'ICL') {
    const preview = await calculateIclAdjustment(lease);
    return { method: 'ICL' as const, ...preview };
  }

  return {
    method: (lease.adjustmentMethod || 'MANUAL') as string,
    oldRent: Number(lease.currentRent),
    newRent: null,
    percent: Number(lease.increasePercent || 0),
    baseDate: null,
    baseIcl: null,
    currentDate: null,
    currentIcl: null,
    indexUsed: lease.adjustmentIndex || lease.adjustmentMethod || 'Manual',
  };
}

export async function applyPropertyLeaseIncreaseAction(data: {
  leaseId: string;
  manualPercent?: number;
  manualNewRent?: number;
  indexUsed?: string;
}) {
  const { tenant, session } = await requirePermission('leases', 'update');
  const lease = await getLeaseForAdjustment(tenant.id, data.leaseId);
  if (!lease) throw new Error('No se encontró un contrato vigente para aplicar el aumento.');

  const oldRent = Number(lease.currentRent);
  let newRent: number;
  let percent: number;
  let indexUsed: string;

  if (lease.adjustmentMethod === 'ICL') {
    const calculation = await calculateIclAdjustment(lease);
    newRent = calculation.newRent;
    percent = calculation.percent;
    indexUsed = calculation.indexUsed;
  } else {
    const manualNewRent = Number(data.manualNewRent || 0);
    const manualPercent = Number(data.manualPercent || 0);

    if (Number.isFinite(manualNewRent) && manualNewRent > 0) {
      if (manualNewRent <= oldRent) throw new Error('El nuevo alquiler debe ser mayor al alquiler actual.');
      newRent = roundMoney(manualNewRent);
      percent = Math.round(((newRent / oldRent) - 1) * 10000) / 100;
    } else {
      if (!Number.isFinite(manualPercent) || manualPercent <= 0 || manualPercent > 1000) {
        throw new Error('Ingresá un porcentaje o un nuevo alquiler válido.');
      }
      percent = manualPercent;
      newRent = roundMoney(oldRent * (1 + percent / 100));
    }
    indexUsed = (data.indexUsed?.trim() || lease.adjustmentIndex || lease.adjustmentMethod || 'Manual').slice(0, 50);
  }

  if (newRent === oldRent) throw new Error('El cálculo no modifica el alquiler actual.');

  const changeDate = new Date();
  const periodMonths = Math.max(1, lease.updatePeriodMonths || 4);
  const nextAdjustmentDate = addMonths(changeDate, periodMonths);

  await platformPrisma.$transaction(async (tx) => {
    await tx.rentHistory.create({
      data: {
        propertyLeaseId: lease.id,
        changeDate,
        oldRent,
        newRent,
        percent,
        indexUsed,
      },
    });

    await tx.propertyLease.update({
      where: { id: lease.id },
      data: {
        currentRent: newRent,
        increasePercent: percent,
        nextAdjustmentDate,
      },
    });
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'LEASE_INCREASE_APPLIED',
    entityType: 'PropertyLease',
    entityId: lease.id,
    metadata: {
      propertyId: lease.propertyId,
      adjustmentMethod: lease.adjustmentMethod,
      oldRent,
      newRent,
      percent,
      indexUsed,
      nextAdjustmentDate: nextAdjustmentDate.toISOString(),
      source: 'property-360',
    },
  });

  revalidatePath(`/propiedades/${lease.propertyId}`);
  revalidatePath('/propiedades');
  revalidatePath('/contratos');
  revalidatePath(`/contratos/${lease.id}`);
  revalidatePath('/aumentos');
  revalidatePath('/dashboard');

  return {
    success: true,
    method: lease.adjustmentMethod,
    oldRent,
    newRent,
    percent,
    indexUsed,
    nextAdjustmentDate: nextAdjustmentDate.toISOString(),
  };
}
