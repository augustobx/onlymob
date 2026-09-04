'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { numberToWords } from '@/lib/number-to-words';
import { auditTenantAction, requireTenantAdmin } from '@/lib/tenant-guard';

export async function getDebtsAction(filters?: {
  status?: string;
  type?: string;
  renterId?: string;
}) {
  const { tenant } = await requireTenantAdmin();
  const where: any = { tenantId: tenant.id };

  if (filters?.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters?.type && filters.type !== 'ALL') where.type = filters.type;
  if (filters?.renterId) where.renterId = filters.renterId;

  const debts = await platformPrisma.debt.findMany({
    where,
    include: {
      renter: true,
      propertyLease: { include: { property: true } },
      garageLease: { include: { spaces: { include: { space: true } } } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
    orderBy: { dueDate: 'asc' },
  });

  return debts.map((d) => {
    const amount = Number(d.amount);
    const paidAmount = Number(d.paidAmount);
    const remaining = Math.max(0, amount - paidAmount);
    const isOverdue = d.status !== 'PAID' && new Date(d.dueDate) < new Date();

    let assetLabel = 'Alquiler';
    if (d.propertyLease) {
      assetLabel = `Propiedad: ${d.propertyLease.property.code} (${d.propertyLease.property.address})`;
    } else if (d.garageLease) {
      assetLabel = `Cochera: Plazas ${d.garageLease.spaces.map((s) => `#${s.space.spaceNumber}`).join(', ')}`;
    }

    return {
      id: d.id,
      leaseType: d.leaseType,
      type: d.type,
      description: d.description,
      amount,
      paidAmount,
      remaining,
      dueDate: d.dueDate,
      status: isOverdue ? 'OVERDUE' : d.status,
      assetLabel,
      renter: {
        id: d.renter.id,
        name: `${d.renter.firstName} ${d.renter.lastName}`,
        dni: d.renter.dni,
        phone: d.renter.phone,
        email: d.renter.email,
      },
      payments: d.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paidAt: p.paidAt,
        method: p.method,
        reference: p.reference,
        receiptNumber: p.receiptNumber,
      })),
    };
  });
}

export async function recordPaymentAction(data: {
  debtId: string;
  amount: number;
  method: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MERCADOPAGO' | 'OTRO';
  reference?: string;
  notes?: string;
}) {
  const { tenant, session } = await requireTenantAdmin();
  if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error('El importe debe ser mayor a cero.');

  const result = await platformPrisma.$transaction(async (tx) => {
    const debt = await tx.debt.findFirst({
      where: { id: data.debtId, tenantId: tenant.id },
    });
    if (!debt) throw new Error('Deuda no encontrada.');

    const currentPaid = Number(debt.paidAmount);
    const totalAmount = Number(debt.amount);
    const remaining = Math.max(0, totalAmount - currentPaid);
    if (data.amount > remaining + 0.01) {
      throw new Error(`El pago ($${data.amount}) excede el saldo adeudado ($${remaining}).`);
    }

    const newPaidAmount = currentPaid + data.amount;
    const newStatus = newPaidAmount >= totalAmount - 0.01 ? 'PAID' : 'PARTIAL';
    const year = new Date().getFullYear();
    const counter = await tx.tenantCounter.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: `receipt:${year}` } },
      create: { tenantId: tenant.id, key: `receipt:${year}`, value: 1 },
      update: { value: { increment: 1 } },
    });
    const receiptNumber = `${year}-${String(counter.value).padStart(6, '0')}`;

    const payment = await tx.payment.create({
      data: {
        tenantId: tenant.id,
        debtId: debt.id,
        amount: data.amount,
        paidAt: new Date(),
        method: data.method,
        reference: data.reference?.trim() || null,
        receiptNumber,
        notes: data.notes?.trim() || null,
      },
    });

    await tx.debt.update({
      where: { id: debt.id },
      data: { paidAmount: newPaidAmount, status: newStatus },
    });

    return { payment, receiptNumber, debtId: debt.id };
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'PAYMENT_RECORDED',
    entityType: 'Payment',
    entityId: result.payment.id,
    metadata: {
      debtId: result.debtId,
      amount: data.amount,
      method: data.method,
      receiptNumber: result.receiptNumber,
    },
  });

  revalidatePath('/cobranzas');
  revalidatePath('/dashboard');
  return { success: true, paymentId: result.payment.id, receiptNumber: result.receiptNumber };
}

export async function getReceiptDetailsAction(paymentId: string) {
  const { tenant } = await requireTenantAdmin();

  const payment = await platformPrisma.payment.findFirst({
    where: { id: paymentId, tenantId: tenant.id },
    include: {
      debt: {
        include: {
          renter: true,
          propertyLease: { include: { property: true } },
          garageLease: {
            include: { spaces: { include: { space: { include: { garage: true } } } } },
          },
        },
      },
    },
  });

  if (!payment) throw new Error('Pago no encontrado.');

  const amount = Number(payment.amount);
  let conceptDetails = payment.debt.description;
  let assetAddress = tenant.address || 'Inmueble administrado';

  if (payment.debt.propertyLease) {
    assetAddress = payment.debt.propertyLease.property.address;
    conceptDetails += ` - Propiedad: ${payment.debt.propertyLease.property.code}`;
  } else if (payment.debt.garageLease) {
    const spaces = payment.debt.garageLease.spaces.map((s) => s.space.spaceNumber).join(', ');
    assetAddress = payment.debt.garageLease.spaces[0]?.space.garage.address || 'Cochera';
    conceptDetails += ` - Cocheras N° ${spaces}`;
  }

  return {
    receiptNumber: payment.receiptNumber || 'SIN-NUMERO',
    paymentDate: payment.paidAt,
    amount,
    amountWords: numberToWords(amount),
    method: payment.method,
    reference: payment.reference,
    notes: payment.notes,
    concept: conceptDetails,
    assetAddress,
    tenant: {
      name: tenant.name,
      receiptHeader: tenant.receiptHeader || tenant.name,
      address: tenant.address,
      phone: tenant.phone,
      cuit: tenant.cuit,
    },
    renter: {
      name: `${payment.debt.renter.firstName} ${payment.debt.renter.lastName}`,
      dni: payment.debt.renter.dni,
      email: payment.debt.renter.email,
      phone: payment.debt.renter.phone,
    },
  };
}

export async function getDashboardMetricsAction() {
  const { tenant } = await requireTenantAdmin();
  const now = new Date();
  const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    propertyDebtsOverdue,
    propertyDebtsDueSoon,
    garageDebtsOverdue,
    garageDebtsDueSoon,
    propertiesRented,
    propertiesTotal,
    garagesTotal,
    spacesOccupied,
    spacesTotal,
    paymentsThisMonth,
  ] = await Promise.all([
    platformPrisma.debt.count({ where: { tenantId: tenant.id, leaseType: 'PROPERTY', type: 'ALQUILER', status: { in: ['PENDING','PARTIAL','OVERDUE'] }, dueDate: { lt: now } } }),
    platformPrisma.debt.count({ where: { tenantId: tenant.id, leaseType: 'PROPERTY', type: 'ALQUILER', status: { in: ['PENDING','PARTIAL','OVERDUE'] }, dueDate: { gte: now, lte: in10Days } } }),
    platformPrisma.debt.count({ where: { tenantId: tenant.id, leaseType: 'GARAGE', type: 'ALQUILER', status: { in: ['PENDING','PARTIAL','OVERDUE'] }, dueDate: { lt: now } } }),
    platformPrisma.debt.count({ where: { tenantId: tenant.id, leaseType: 'GARAGE', type: 'ALQUILER', status: { in: ['PENDING','PARTIAL','OVERDUE'] }, dueDate: { gte: now, lte: in10Days } } }),
    platformPrisma.property.count({ where: { tenantId: tenant.id, status: 'ALQUILADO' } }),
    platformPrisma.property.count({ where: { tenantId: tenant.id, status: { not: 'ARCHIVADO' } } }),
    platformPrisma.garage.count({ where: { tenantId: tenant.id } }),
    platformPrisma.garageSpace.count({ where: { garage: { tenantId: tenant.id }, status: 'OCCUPIED' } }),
    platformPrisma.garageSpace.count({ where: { garage: { tenantId: tenant.id } } }),
    platformPrisma.payment.findMany({
      where: { tenantId: tenant.id, paidAt: { gte: startOfMonth } },
      select: { amount: true },
    }),
  ]);

  const totalRevenueMonth = paymentsThisMonth.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    propertyDebtsOverdue,
    propertyDebtsDueSoon,
    garageDebtsOverdue,
    garageDebtsDueSoon,
    propertiesRented,
    propertiesTotal,
    propertiesFree: Math.max(0, propertiesTotal - propertiesRented),
    garagesTotal,
    spacesOccupied,
    spacesTotal,
    spacesFree: Math.max(0, spacesTotal - spacesOccupied),
    totalRevenueMonth,
  };
}
