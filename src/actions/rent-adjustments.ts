'use server';

import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';

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

  return { overdue, months, items };
}
