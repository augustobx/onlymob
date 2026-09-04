'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction, requireTenantAdmin } from '@/lib/tenant-guard';

const EXPENSE_STATUSES = ['PENDING','PAID','CANCELED'] as const;
const SETTLEMENT_STATUSES = ['DRAFT','READY','PAID','CANCELED'] as const;
const DEBT_TYPES = ['ALQUILER','EXPENSAS','DEPOSITO','LUZ','GAS','AGUA','SEGURO','IMPUESTO','PENALIDAD','INTERES','NOTA_DEBITO','NOTA_CREDITO','OTROS'] as const;

function parseDate(value: string, label: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} inválida.`);
  return date;
}

async function assertProperty(tenantId: string, propertyId: string) {
  const property = await platformPrisma.property.findFirst({ where: { id: propertyId, tenantId, archivedAt: null, status: { not: 'ARCHIVADO' } } });
  if (!property) throw new Error('Propiedad no encontrada.');
  return property;
}

async function assertContact(tenantId: string, contactId?: string | null) {
  if (!contactId) return null;
  const contact = await platformPrisma.contact.findFirst({ where: { id: contactId, tenantId, archivedAt: null } });
  if (!contact) throw new Error('Contacto no encontrado.');
  return contact;
}

export async function getPropertyManagementDataAction() {
  const { tenant } = await requireTenantAdmin();
  const [expenses, settlements, owners, properties, providers, leases, recurringCharges] = await Promise.all([
    platformPrisma.propertyExpense.findMany({
      where: { tenantId: tenant.id },
      include: { property: { select: { id: true, code: true, address: true } }, provider: { select: { id: true, firstName: true, lastName: true, companyName: true } }, owner: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'desc' }, { createdAt: 'desc' }],
    }),
    platformPrisma.ownerSettlement.findMany({
      where: { tenantId: tenant.id },
      include: { owner: { select: { id: true, firstName: true, lastName: true, bankAlias: true, bankCbu: true } }, lines: { include: { property: { select: { code: true, address: true } } }, orderBy: { createdAt: 'asc' } } },
      orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
    }),
    platformPrisma.contact.findMany({
      where: { tenantId: tenant.id, archivedAt: null, roles: { some: { role: 'OWNER' } } },
      include: { ownedProperties: { include: { property: { select: { id: true, code: true, address: true } } } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    platformPrisma.property.findMany({ where: { tenantId: tenant.id, archivedAt: null, status: { not: 'ARCHIVADO' } }, select: { id: true, code: true, address: true }, orderBy: { code: 'asc' } }),
    platformPrisma.contact.findMany({ where: { tenantId: tenant.id, archivedAt: null, roles: { some: { role: 'PROVIDER' } } }, select: { id: true, firstName: true, lastName: true, companyName: true }, orderBy: [{ companyName: 'asc' }, { lastName: 'asc' }] }),
    platformPrisma.propertyLease.findMany({ where: { tenantId: tenant.id, status: { in: ['CURRENT','EXPIRING'] } }, include: { property: { select: { id: true, code: true, address: true } }, renter: { select: { firstName: true, lastName: true } } }, orderBy: { endDate: 'asc' } }),
    platformPrisma.recurringCharge.findMany({ where: { tenantId: tenant.id }, include: { lease: { include: { property: { select: { code: true, address: true } }, renter: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: 'desc' } }),
  ]);

  return {
    expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
    settlements: settlements.map((s) => ({ ...s, grossCollected: Number(s.grossCollected), expensesTotal: Number(s.expensesTotal), commissionTotal: Number(s.commissionTotal), taxesTotal: Number(s.taxesTotal), netAmount: Number(s.netAmount), lines: s.lines.map((l) => ({ ...l, amount: Number(l.amount) })) })),
    owners,
    properties,
    providers,
    leases: leases.map((l) => ({ ...l, currentRent: Number(l.currentRent) })),
    recurringCharges: recurringCharges.map((c) => ({ ...c, amount: c.amount ? Number(c.amount) : null, percentage: c.percentage ? Number(c.percentage) : null })),
  };
}

const ExpenseSchema = z.object({
  propertyId: z.string().min(1),
  providerContactId: z.string().optional().nullable(),
  ownerContactId: z.string().optional().nullable(),
  category: z.string().min(2).max(80),
  description: z.string().min(2).max(255),
  amount: z.number().positive(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(EXPENSE_STATUSES).default('PENDING'),
  chargeToRenter: z.boolean().default(false),
  chargeToOwner: z.boolean().default(true),
  documentUrl: z.string().url().optional().or(z.literal('')).nullable(),
  notes: z.string().max(6000).optional().nullable(),
});

export async function savePropertyExpenseAction(data: z.input<typeof ExpenseSchema> & { id?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  const validated = ExpenseSchema.parse(data);
  const property = await assertProperty(tenant.id, validated.propertyId);
  await Promise.all([assertContact(tenant.id, validated.providerContactId), assertContact(tenant.id, validated.ownerContactId)]);
  const payload = {
    propertyId: property.id,
    providerContactId: validated.providerContactId || null,
    ownerContactId: validated.ownerContactId || null,
    category: validated.category.trim(),
    description: validated.description.trim(),
    amount: validated.amount,
    dueDate: validated.dueDate ? parseDate(validated.dueDate, 'Fecha de vencimiento') : null,
    status: validated.status,
    paidAt: validated.status === 'PAID' ? new Date() : null,
    chargeToRenter: validated.chargeToRenter,
    chargeToOwner: validated.chargeToOwner,
    documentUrl: validated.documentUrl?.trim() || null,
    notes: validated.notes?.trim() || null,
  };
  let expense;
  if (data.id) {
    const existing = await platformPrisma.propertyExpense.findFirst({ where: { id: data.id, tenantId: tenant.id } });
    if (!existing) throw new Error('Gasto no encontrado.');
    expense = await platformPrisma.propertyExpense.update({ where: { id: existing.id }, data: payload });
  } else expense = await platformPrisma.propertyExpense.create({ data: { tenantId: tenant.id, ...payload } });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: data.id ? 'PROPERTY_EXPENSE_UPDATED' : 'PROPERTY_EXPENSE_CREATED', entityType: 'PropertyExpense', entityId: expense.id, metadata: { propertyId: property.id, amount: validated.amount } });
  revalidatePath('/administracion'); revalidatePath(`/propiedades/${property.id}`); revalidatePath('/dashboard');
  return { success: true, expenseId: expense.id };
}

export async function setPropertyExpenseStatusAction(expenseId: string, status: typeof EXPENSE_STATUSES[number]) {
  const { tenant, session } = await requireTenantAdmin();
  const expense = await platformPrisma.propertyExpense.findFirst({ where: { id: expenseId, tenantId: tenant.id } });
  if (!expense) throw new Error('Gasto no encontrado.');
  await platformPrisma.propertyExpense.update({ where: { id: expense.id }, data: { status, paidAt: status === 'PAID' ? new Date() : null } });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'PROPERTY_EXPENSE_STATUS_CHANGED', entityType: 'PropertyExpense', entityId: expense.id, metadata: { status } });
  revalidatePath('/administracion'); revalidatePath('/dashboard');
  return { success: true };
}

const RecurringChargeSchema = z.object({
  propertyLeaseId: z.string().min(1),
  type: z.enum(DEBT_TYPES),
  description: z.string().min(2).max(255),
  amount: z.number().positive().optional().nullable(),
  percentage: z.number().positive().max(1000).optional().nullable(),
  frequencyMonths: z.number().int().min(1).max(24).default(1),
  dueDay: z.number().int().min(1).max(28).default(10),
  startsAt: z.string().min(10),
  endsAt: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

export async function saveRecurringChargeAction(data: z.input<typeof RecurringChargeSchema> & { id?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  const validated = RecurringChargeSchema.parse(data);
  if (validated.amount == null && validated.percentage == null) throw new Error('Indicá un importe o un porcentaje.');
  const lease = await platformPrisma.propertyLease.findFirst({ where: { id: validated.propertyLeaseId, tenantId: tenant.id } });
  if (!lease) throw new Error('Contrato no encontrado.');
  const startsAt = parseDate(validated.startsAt, 'Fecha de inicio');
  const endsAt = validated.endsAt ? parseDate(validated.endsAt, 'Fecha de fin') : null;
  if (endsAt && endsAt < startsAt) throw new Error('La fecha de fin no puede ser anterior al inicio.');
  const payload = { propertyLeaseId: lease.id, type: validated.type, description: validated.description.trim(), amount: validated.amount ?? null, percentage: validated.percentage ?? null, frequencyMonths: validated.frequencyMonths, dueDay: validated.dueDay, startsAt, endsAt, active: validated.active };
  let charge;
  if (data.id) {
    const existing = await platformPrisma.recurringCharge.findFirst({ where: { id: data.id, tenantId: tenant.id } });
    if (!existing) throw new Error('Cargo recurrente no encontrado.');
    charge = await platformPrisma.recurringCharge.update({ where: { id: existing.id }, data: payload });
  } else charge = await platformPrisma.recurringCharge.create({ data: { tenantId: tenant.id, ...payload } });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: data.id ? 'RECURRING_CHARGE_UPDATED' : 'RECURRING_CHARGE_CREATED', entityType: 'RecurringCharge', entityId: charge.id });
  revalidatePath('/administracion'); revalidatePath('/cobranzas');
  return { success: true, recurringChargeId: charge.id };
}

export async function generateRecurringChargesAction(periodStr: string) {
  const { tenant, session } = await requireTenantAdmin();
  if (!/^\d{4}-\d{2}$/.test(periodStr)) throw new Error('Período inválido.');
  const [year, month] = periodStr.split('-').map(Number);
  if (month < 1 || month > 12) throw new Error('Mes inválido.');
  const periodStart = new Date(year, month - 1, 1, 12, 0, 0);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  const rules = await platformPrisma.recurringCharge.findMany({
    where: { tenantId: tenant.id, active: true, startsAt: { lte: periodEnd }, OR: [{ endsAt: null }, { endsAt: { gte: periodStart } }] },
    include: { lease: true },
  });

  let created = 0;
  await platformPrisma.$transaction(async (tx) => {
    for (const rule of rules) {
      const monthsFromStart = (year - rule.startsAt.getFullYear()) * 12 + (month - 1 - rule.startsAt.getMonth());
      if (monthsFromStart < 0 || monthsFromStart % rule.frequencyMonths !== 0) continue;
      const marker = `[RC:${rule.id}:${periodStr}]`;
      const existing = await tx.debt.findFirst({ where: { tenantId: tenant.id, propertyLeaseId: rule.propertyLeaseId, description: { contains: marker } } });
      if (existing) continue;
      const amount = rule.amount != null ? Number(rule.amount) : Number(rule.lease.currentRent) * Number(rule.percentage || 0) / 100;
      if (amount <= 0) continue;
      const dueDate = new Date(year, month - 1, Math.min(rule.dueDay, 28), 12, 0, 0);
      await tx.debt.create({ data: { tenantId: tenant.id, leaseType: 'PROPERTY', propertyLeaseId: rule.propertyLeaseId, renterId: rule.lease.renterId, type: rule.type, description: `${rule.description} ${periodStr} ${marker}`, amount: Math.round(amount * 100) / 100, dueDate, paidAmount: 0, status: 'PENDING' } });
      created += 1;
    }
  });

  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'RECURRING_CHARGES_GENERATED', entityType: 'RecurringCharge', metadata: { period: periodStr, created } });
  revalidatePath('/administracion'); revalidatePath('/cobranzas'); revalidatePath('/dashboard');
  return { success: true, created };
}

export async function createOwnerSettlementAction(data: { ownerContactId: string; periodStart: string; periodEnd: string; taxPercent?: number; notes?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  const owner = await assertContact(tenant.id, data.ownerContactId);
  if (!owner) throw new Error('Propietario no encontrado.');
  const start = parseDate(data.periodStart, 'Inicio del período');
  const end = parseDate(data.periodEnd, 'Fin del período');
  end.setHours(23, 59, 59, 999);
  if (end < start) throw new Error('El fin del período no puede ser anterior al inicio.');
  const taxPercent = data.taxPercent || 0;
  if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) throw new Error('Porcentaje de impuestos inválido.');

  const existing = await platformPrisma.ownerSettlement.findFirst({ where: { tenantId: tenant.id, ownerContactId: owner.id, periodStart: start, periodEnd: end, status: { not: 'CANCELED' } } });
  if (existing) throw new Error('Ya existe una liquidación para ese propietario y período.');

  const ownerships = await platformPrisma.propertyOwner.findMany({ where: { tenantId: tenant.id, contactId: owner.id }, include: { property: true } });
  if (ownerships.length === 0) throw new Error('El contacto no tiene propiedades asignadas.');
  const propertyIds = ownerships.map((o) => o.propertyId);

  const [payments, expenses] = await Promise.all([
    platformPrisma.payment.findMany({
      where: { tenantId: tenant.id, paidAt: { gte: start, lte: end }, debt: { propertyLease: { is: { propertyId: { in: propertyIds } } } } },
      include: { debt: { include: { propertyLease: { include: { property: true } } } } },
      orderBy: { paidAt: 'asc' },
    }),
    platformPrisma.propertyExpense.findMany({
      where: { tenantId: tenant.id, propertyId: { in: propertyIds }, chargeToOwner: true, status: { not: 'CANCELED' }, createdAt: { gte: start, lte: end } },
      include: { property: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const ownershipMap = new Map(ownerships.map((o) => [o.propertyId, { share: Number(o.ownershipPercentage) / 100, commission: Number(o.property.commissionPercent || 0) / 100 }]));
  const incomeLines = payments.flatMap((payment) => {
    const property = payment.debt.propertyLease?.property;
    if (!property) return [];
    const ownerData = ownershipMap.get(property.id);
    if (!ownerData) return [];
    const amount = Number(payment.amount) * ownerData.share;
    return [{ type: 'INCOME', sourceType: 'Payment', sourceId: payment.id, propertyId: property.id, description: `${payment.debt.description} - cobrado`, amount }];
  });
  const expenseLines = expenses.map((expense) => {
    const ownerData = ownershipMap.get(expense.propertyId)!;
    return { type: 'EXPENSE', sourceType: 'PropertyExpense', sourceId: expense.id, propertyId: expense.propertyId, description: expense.description, amount: -Number(expense.amount) * ownerData.share };
  });
  const commissionByProperty = new Map<string, number>();
  for (const line of incomeLines) {
    const ownerData = ownershipMap.get(line.propertyId)!;
    commissionByProperty.set(line.propertyId, (commissionByProperty.get(line.propertyId) || 0) + line.amount * ownerData.commission);
  }
  const commissionLines = [...commissionByProperty.entries()].filter(([, amount]) => amount > 0).map(([propertyId, amount]) => ({ type: 'COMMISSION', sourceType: 'Property', sourceId: propertyId, propertyId, description: 'Comisión de administración', amount: -amount }));
  const grossCollected = incomeLines.reduce((sum, line) => sum + line.amount, 0);
  const expensesTotal = Math.abs(expenseLines.reduce((sum, line) => sum + line.amount, 0));
  const commissionTotal = Math.abs(commissionLines.reduce((sum, line) => sum + line.amount, 0));
  const taxableBase = Math.max(0, grossCollected - expensesTotal - commissionTotal);
  const taxesTotal = taxableBase * taxPercent / 100;
  const netAmount = grossCollected - expensesTotal - commissionTotal - taxesTotal;
  const taxLines = taxesTotal > 0 ? [{ type: 'TAX', sourceType: null, sourceId: null, propertyId: null, description: `Impuestos/retenciones ${taxPercent}%`, amount: -taxesTotal }] : [];
  const allLines = [...incomeLines, ...expenseLines, ...commissionLines, ...taxLines];

  const settlement = await platformPrisma.$transaction(async (tx) => {
    const created = await tx.ownerSettlement.create({ data: { tenantId: tenant.id, ownerContactId: owner.id, periodStart: start, periodEnd: end, grossCollected, expensesTotal, commissionTotal, taxesTotal, netAmount, status: 'READY', notes: data.notes?.trim() || null } });
    if (allLines.length) await tx.ownerSettlementLine.createMany({ data: allLines.map((line) => ({ settlementId: created.id, propertyId: line.propertyId, type: line.type, sourceType: line.sourceType, sourceId: line.sourceId, description: line.description, amount: Math.round(line.amount * 100) / 100 })) });
    return created;
  });

  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'OWNER_SETTLEMENT_CREATED', entityType: 'OwnerSettlement', entityId: settlement.id, metadata: { ownerContactId: owner.id, grossCollected, expensesTotal, commissionTotal, taxesTotal, netAmount } });
  revalidatePath('/administracion'); revalidatePath('/dashboard');
  return { success: true, settlementId: settlement.id, netAmount: Math.round(netAmount * 100) / 100 };
}

export async function setOwnerSettlementStatusAction(settlementId: string, status: typeof SETTLEMENT_STATUSES[number]) {
  const { tenant, session } = await requireTenantAdmin();
  const settlement = await platformPrisma.ownerSettlement.findFirst({ where: { id: settlementId, tenantId: tenant.id } });
  if (!settlement) throw new Error('Liquidación no encontrada.');
  await platformPrisma.ownerSettlement.update({ where: { id: settlement.id }, data: { status, paidAt: status === 'PAID' ? new Date() : null } });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'OWNER_SETTLEMENT_STATUS_CHANGED', entityType: 'OwnerSettlement', entityId: settlement.id, metadata: { status } });
  revalidatePath('/administracion'); revalidatePath('/dashboard');
  return { success: true };
}
