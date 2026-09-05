'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';
import { auditTenantAction } from '@/lib/tenant-guard';

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function applyPropertyLeaseIncreaseAction(data: {
  leaseId: string;
  percent: number;
  indexUsed?: string;
}) {
  const { tenant, session } = await requirePermission('leases', 'update');
  const percent = Number(data.percent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 1000) {
    throw new Error('Ingresá un porcentaje de aumento válido.');
  }

  const lease = await platformPrisma.propertyLease.findFirst({
    where: {
      id: data.leaseId,
      tenantId: tenant.id,
      status: { in: ['CURRENT', 'EXPIRING'] },
    },
    select: {
      id: true,
      propertyId: true,
      currentRent: true,
      updatePeriodMonths: true,
      adjustmentIndex: true,
      adjustmentMethod: true,
    },
  });

  if (!lease) throw new Error('No se encontró un contrato vigente para aplicar el aumento.');

  const oldRent = Number(lease.currentRent);
  const newRent = Math.round(oldRent * (1 + percent / 100) * 100) / 100;
  const changeDate = new Date();
  const periodMonths = Math.max(1, lease.updatePeriodMonths || 4);
  const nextAdjustmentDate = addMonths(changeDate, periodMonths);
  const indexUsed = (data.indexUsed?.trim() || lease.adjustmentIndex || lease.adjustmentMethod || 'Ajuste contractual').slice(0, 50);

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
  revalidatePath('/dashboard');

  return {
    success: true,
    oldRent,
    newRent,
    percent,
    nextAdjustmentDate: nextAdjustmentDate.toISOString(),
  };
}
