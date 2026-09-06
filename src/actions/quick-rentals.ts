'use server';

import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';

type OpenDebt = {
  amount: unknown;
  paidAmount: unknown;
  dueDate: Date;
  status: string;
};

function debtBalance(debt: OpenDebt) {
  return Math.max(0, Number(debt.amount || 0) - Number(debt.paidAmount || 0));
}

export async function getQuickRentalsStatusAction() {
  const { tenant } = await requirePermission('leases', 'read');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [propertyLeases, garageLeases] = await Promise.all([
    platformPrisma.propertyLease.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['CURRENT', 'EXPIRING'] },
      },
      select: {
        id: true,
        currentRent: true,
        endDate: true,
        property: { select: { code: true, address: true } },
        renter: { select: { firstName: true, lastName: true, dni: true } },
        debts: {
          where: {
            type: 'ALQUILER',
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          },
          select: { amount: true, paidAmount: true, dueDate: true, status: true },
        },
      },
      orderBy: { property: { code: 'asc' } },
    }),
    platformPrisma.garageLease.findMany({
      where: { tenantId: tenant.id, status: 'CURRENT' },
      select: {
        id: true,
        totalRent: true,
        endDate: true,
        renter: { select: { firstName: true, lastName: true, dni: true } },
        spaces: {
          select: {
            space: {
              select: {
                spaceNumber: true,
                garage: { select: { address: true } },
              },
            },
          },
        },
        debts: {
          where: {
            type: 'ALQUILER',
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          },
          select: { amount: true, paidAmount: true, dueDate: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  function statusFromDebts(debts: OpenDebt[]) {
    const overdueDebts = debts.filter((debt) => debtBalance(debt) > 0.009 && (debt.status === 'OVERDUE' || debt.dueDate < today));
    const openBalance = debts.reduce((sum, debt) => sum + debtBalance(debt), 0);
    const overdueBalance = overdueDebts.reduce((sum, debt) => sum + debtBalance(debt), 0);
    const oldestOverdueDate = overdueDebts.length
      ? overdueDebts.reduce((oldest, debt) => debt.dueDate < oldest ? debt.dueDate : oldest, overdueDebts[0].dueDate)
      : null;

    return { overdue: overdueDebts.length > 0, openBalance, overdueBalance, oldestOverdueDate };
  }

  const properties = propertyLeases.map((lease) => {
    const debtStatus = statusFromDebts(lease.debts as OpenDebt[]);
    return {
      id: lease.id,
      type: 'PROPERTY' as const,
      renterName: `${lease.renter.firstName} ${lease.renter.lastName}`.trim(),
      renterDni: lease.renter.dni,
      assetTitle: `${lease.property.code} · ${lease.property.address}`,
      assetDetail: 'Inmueble',
      monthlyRent: Number(lease.currentRent),
      endDate: lease.endDate.toISOString(),
      contractHref: `/contratos/${lease.id}`,
      ...debtStatus,
      oldestOverdueDate: debtStatus.oldestOverdueDate?.toISOString() || null,
    };
  });

  const garages = garageLeases.map((lease) => {
    const debtStatus = statusFromDebts(lease.debts as OpenDebt[]);
    const address = lease.spaces[0]?.space.garage.address || 'Cochera';
    const spaces = lease.spaces.map((item) => `#${item.space.spaceNumber}`).join(', ');
    return {
      id: lease.id,
      type: 'GARAGE' as const,
      renterName: `${lease.renter.firstName} ${lease.renter.lastName}`.trim(),
      renterDni: lease.renter.dni,
      assetTitle: `${address}${spaces ? ` · ${spaces}` : ''}`,
      assetDetail: 'Cochera',
      monthlyRent: Number(lease.totalRent),
      endDate: lease.endDate.toISOString(),
      contractHref: '/contratos',
      ...debtStatus,
      oldestOverdueDate: debtStatus.oldestOverdueDate?.toISOString() || null,
    };
  });

  return [...properties, ...garages].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return a.renterName.localeCompare(b.renterName, 'es');
  });
}
