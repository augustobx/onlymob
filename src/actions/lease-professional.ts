'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction } from '@/lib/tenant-guard';
import { requirePermission } from '@/lib/permissions';

const LEASE_STATUSES = ['DRAFT','CURRENT','EXPIRING','RENEWED','TERMINATED','CANCELED'] as const;
const ADJUSTMENT_METHODS = ['ICL','MANUAL','FIXED_PERCENT','IPC','OTHER'] as const;
type LeaseStatusValue = typeof LEASE_STATUSES[number];
type AdjustmentMethodValue = typeof ADJUSTMENT_METHODS[number];

function optionalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error('Fecha inválida.');
  return date;
}

function addMonths(value: Date, months: number) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  date.setMonth(date.getMonth() + months);
  return date;
}

export async function getProfessionalLeaseDataAction() {
  const { tenant } = await requirePermission('leases', 'read');
  const [leases, guarantors] = await Promise.all([
    platformPrisma.propertyLease.findMany({
      where: { tenantId: tenant.id },
      include: {
        property: { select: { id: true, code: true, address: true } },
        renter: { select: { firstName: true, lastName: true, dni: true } },
        guarantor: { select: { id: true, firstName: true, lastName: true, documentNumber: true, phone: true } },
      },
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
    }),
    platformPrisma.contact.findMany({
      where: { tenantId: tenant.id, archivedAt: null, isActive: true },
      select: { id: true, firstName: true, lastName: true, documentNumber: true, phone: true, roles: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
  ]);

  return {
    leases: leases.map((lease) => ({
      id: lease.id,
      propertyId: lease.propertyId,
      propertyCode: lease.property.code,
      propertyAddress: lease.property.address,
      renterName: `${lease.renter.firstName} ${lease.renter.lastName}`,
      renterDni: lease.renter.dni,
      startDate: lease.startDate,
      endDate: lease.endDate,
      extensionUntil: lease.extensionUntil,
      currentRent: Number(lease.currentRent),
      deposit: Number(lease.deposit),
      increasePercent: Number(lease.increasePercent),
      updatePeriodMonths: lease.updatePeriodMonths,
      adjustmentMethod: lease.adjustmentMethod,
      adjustmentIndex: lease.adjustmentIndex,
      nextAdjustmentDate: lease.nextAdjustmentDate,
      guaranteeType: lease.guaranteeType,
      guaranteeDetails: lease.guaranteeDetails,
      guarantorContactId: lease.guarantorContactId,
      guarantor: lease.guarantor,
      renewalReference: lease.renewalReference,
      inventoryNotes: lease.inventoryNotes,
      status: lease.status,
      notes: lease.notes,
    })),
    guarantors: guarantors.map((contact) => ({
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
      documentNumber: contact.documentNumber,
      phone: contact.phone,
      isGuarantor: contact.roles.some((role) => role.role === 'GUARANTOR'),
    })),
  };
}

export async function updatePropertyLeaseProfessionalAction(data: {
  leaseId: string;
  startDate?: string | null;
  endDate?: string | null;
  deposit?: number;
  increasePercent?: number;
  updatePeriodMonths?: number;
  guarantorContactId?: string | null;
  extensionUntil?: string | null;
  adjustmentMethod?: AdjustmentMethodValue | string;
  adjustmentIndex?: string | null;
  nextAdjustmentDate?: string | null;
  guaranteeType?: string | null;
  guaranteeDetails?: string | null;
  renewalReference?: string | null;
  inventoryNotes?: string | null;
  status?: LeaseStatusValue;
  notes?: string | null;
}) {
  const { tenant, session } = await requirePermission('leases', 'update');
  const lease = await platformPrisma.propertyLease.findFirst({
    where: { id: data.leaseId, tenantId: tenant.id },
    include: { rentHistory: { orderBy: { changeDate: 'desc' }, take: 1 } },
  });
  if (!lease) throw new Error('Contrato no encontrado.');

  const startDate = data.startDate === undefined ? lease.startDate : optionalDate(data.startDate);
  const endDate = data.endDate === undefined ? lease.endDate : optionalDate(data.endDate);
  if (!startDate || !endDate || endDate <= startDate) {
    throw new Error('La fecha de finalización debe ser posterior al inicio.');
  }

  const deposit = data.deposit === undefined ? Number(lease.deposit) : Number(data.deposit);
  if (!Number.isFinite(deposit) || deposit < 0) throw new Error('El depósito no puede ser negativo.');

  const updatePeriodMonths = data.updatePeriodMonths === undefined
    ? lease.updatePeriodMonths
    : Math.trunc(Number(data.updatePeriodMonths));
  if (![1,2,3,4,6,12].includes(updatePeriodMonths)) {
    throw new Error('La periodicidad del ajuste no es válida.');
  }

  const requestedMethod = String(data.adjustmentMethod || lease.adjustmentMethod || 'ICL').toUpperCase();
  if (!ADJUSTMENT_METHODS.includes(requestedMethod as AdjustmentMethodValue)) {
    throw new Error('La modalidad de ajuste no es válida.');
  }
  const adjustmentMethod = requestedMethod as AdjustmentMethodValue;
  const increasePercent = data.increasePercent === undefined ? Number(lease.increasePercent) : Number(data.increasePercent);
  if (!Number.isFinite(increasePercent) || increasePercent < 0 || increasePercent > 1000) {
    throw new Error('El porcentaje de ajuste no es válido.');
  }
  if (adjustmentMethod === 'FIXED_PERCENT' && increasePercent <= 0) {
    throw new Error('Para porcentaje fijo indicá un porcentaje mayor a cero.');
  }

  let guarantorId = lease.guarantorContactId;
  if (data.guarantorContactId !== undefined) {
    guarantorId = null;
    if (data.guarantorContactId) {
      const guarantor = await platformPrisma.contact.findFirst({
        where: { id: data.guarantorContactId, tenantId: tenant.id, archivedAt: null },
      });
      if (!guarantor) throw new Error('El garante no pertenece a esta inmobiliaria.');
      guarantorId = guarantor.id;
    }
  }

  const extensionUntil = data.extensionUntil === undefined ? lease.extensionUntil : optionalDate(data.extensionUntil);
  if (extensionUntil && extensionUntil <= endDate) throw new Error('La prórroga debe ser posterior al vencimiento original.');

  let nextAdjustmentDate = data.nextAdjustmentDate === undefined
    ? lease.nextAdjustmentDate
    : optionalDate(data.nextAdjustmentDate);

  if (!nextAdjustmentDate && ['CURRENT', 'EXPIRING'].includes(data.status || lease.status)) {
    const baseDate = lease.rentHistory[0]?.changeDate || startDate;
    nextAdjustmentDate = addMonths(baseDate, updatePeriodMonths);
    const now = new Date();
    while (nextAdjustmentDate < now) nextAdjustmentDate = addMonths(nextAdjustmentDate, updatePeriodMonths);
  }

  const adjustmentIndex = adjustmentMethod === 'ICL'
    ? 'ICL'
    : adjustmentMethod === 'MANUAL'
      ? null
      : data.adjustmentIndex === undefined
        ? lease.adjustmentIndex
        : data.adjustmentIndex?.trim().slice(0, 40) || null;

  await platformPrisma.$transaction(async (tx) => {
    await tx.propertyLease.update({
      where: { id: lease.id },
      data: {
        startDate,
        endDate,
        deposit,
        increasePercent,
        updatePeriodMonths,
        guarantorContactId: guarantorId,
        extensionUntil,
        adjustmentMethod,
        adjustmentIndex,
        nextAdjustmentDate,
        guaranteeType: data.guaranteeType === undefined ? lease.guaranteeType : data.guaranteeType?.trim().slice(0, 80) || null,
        guaranteeDetails: data.guaranteeDetails === undefined ? lease.guaranteeDetails : data.guaranteeDetails?.trim() || null,
        renewalReference: data.renewalReference === undefined ? lease.renewalReference : data.renewalReference?.trim().slice(0, 120) || null,
        inventoryNotes: data.inventoryNotes === undefined ? lease.inventoryNotes : data.inventoryNotes?.trim() || null,
        status: data.status || lease.status,
        notes: data.notes === undefined ? lease.notes : data.notes?.trim() || null,
      },
    });

    if (guarantorId) {
      const role = await tx.contactRole.findUnique({ where: { contactId_role: { contactId: guarantorId, role: 'GUARANTOR' } } });
      if (!role) await tx.contactRole.create({ data: { contactId: guarantorId, role: 'GUARANTOR' } });
    }
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'PROPERTY_LEASE_UPDATED',
    entityType: 'PropertyLease',
    entityId: lease.id,
    metadata: {
      propertyId: lease.propertyId,
      adjustmentMethod,
      increasePercent,
      updatePeriodMonths,
      nextAdjustmentDate: nextAdjustmentDate?.toISOString() || null,
      status: data.status || lease.status,
    },
  });

  revalidatePath('/contratos');
  revalidatePath(`/contratos/${lease.id}`);
  revalidatePath(`/propiedades/${lease.propertyId}`);
  revalidatePath('/aumentos');
  revalidatePath('/dashboard');
  return { success: true };
}
