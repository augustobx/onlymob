'use server';

import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';

type LeaseDebt = {
  id: string;
  description: string;
  amount: unknown;
  paidAmount: unknown;
  dueDate: Date;
  status: string;
  payments: Array<{
    id: string;
    amount: unknown;
    paidAt: Date;
    method: string;
    receiptNumber: string | null;
  }>;
};

function debtBalance(debt: Pick<LeaseDebt, 'amount' | 'paidAmount'>) {
  return Math.max(0, Number(debt.amount || 0) - Number(debt.paidAmount || 0));
}

function normalizeLeaseDebts(debts: LeaseDebt[], today: Date) {
  const openDebts = debts
    .filter((debt) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(debt.status) && debtBalance(debt) > 0.009)
    .map((debt) => {
      const overdue = debt.status === 'OVERDUE' || debt.dueDate < today;
      return {
        id: debt.id,
        description: debt.description,
        amount: Number(debt.amount),
        paidAmount: Number(debt.paidAmount),
        remaining: debtBalance(debt),
        dueDate: debt.dueDate.toISOString(),
        status: overdue ? 'OVERDUE' : debt.status,
        overdue,
      };
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const overdueDebts = openDebts.filter((debt) => debt.overdue);
  const openBalance = openDebts.reduce((sum, debt) => sum + debt.remaining, 0);
  const overdueBalance = overdueDebts.reduce((sum, debt) => sum + debt.remaining, 0);
  const oldestOverdueDate = overdueDebts[0]?.dueDate || null;

  const recentPayments = debts
    .flatMap((debt) => debt.payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      paidAt: payment.paidAt.toISOString(),
      method: payment.method,
      receiptNumber: payment.receiptNumber,
      debtDescription: debt.description,
    })))
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, 5);

  return {
    overdue: overdueDebts.length > 0,
    openBalance,
    overdueBalance,
    oldestOverdueDate,
    debts: openDebts,
    recentPayments,
  };
}

export async function getQuickRentalsStatusAction() {
  const { tenant } = await requirePermission('leases', 'read');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const debtSelect = {
    where: { type: 'ALQUILER' as const },
    select: {
      id: true,
      description: true,
      amount: true,
      paidAmount: true,
      dueDate: true,
      status: true,
      payments: {
        select: {
          id: true,
          amount: true,
          paidAt: true,
          method: true,
          receiptNumber: true,
        },
        orderBy: { paidAt: 'desc' as const },
        take: 5,
      },
    },
    orderBy: { dueDate: 'desc' as const },
  };

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
        debts: debtSelect,
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
        debts: debtSelect,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const properties = propertyLeases.map((lease) => {
    const debtStatus = normalizeLeaseDebts(lease.debts as LeaseDebt[], today);
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
    };
  });

  const garages = garageLeases.map((lease) => {
    const debtStatus = normalizeLeaseDebts(lease.debts as LeaseDebt[], today);
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
    };
  });

  return [...properties, ...garages].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return a.renterName.localeCompare(b.renterName, 'es');
  });
}
