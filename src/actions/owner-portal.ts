'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import {
  clearOwnerSession,
  createOwnerSession,
  getOwnerSession,
  hashPassword,
  verifyPassword,
} from '@/lib/auth';
import { resolveTenantContext } from '@/lib/tenant-context';
import { auditTenantAction, requireTenantAdmin } from '@/lib/tenant-guard';

export type OwnerAuthActionResult = { success: boolean; error?: string };

export async function loginOwnerAction(formData: FormData): Promise<OwnerAuthActionResult> {
  const identifier = String(formData.get('identifier') || '').trim();
  const password = String(formData.get('password') || '');
  if (!identifier || !password) return { success: false, error: 'Ingresá tu documento/correo y contraseña.' };

  try {
    const tenant = await resolveTenantContext();
    const normalizedEmail = identifier.toLowerCase();
    const owner = await platformPrisma.contact.findFirst({
      where: {
        tenantId: tenant.id,
        isActive: true,
        archivedAt: null,
        ownerPortalEnabled: true,
        roles: { some: { role: 'OWNER' } },
        ownedProperties: { some: { tenantId: tenant.id } },
        OR: [
          { documentNumber: identifier },
          { cuit: identifier },
          { email: normalizedEmail },
        ],
      },
    });

    if (!owner?.ownerPortalPasswordHash) {
      return { success: false, error: 'Propietario no habilitado para acceso al portal. Contactá a la inmobiliaria.' };
    }
    if (!(await verifyPassword(password, owner.ownerPortalPasswordHash))) {
      return { success: false, error: 'Credenciales incorrectas.' };
    }

    await platformPrisma.contact.update({ where: { id: owner.id }, data: { ownerPortalLastLoginAt: new Date() } });
    await platformPrisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: 'OWNER',
        action: 'OWNER_PORTAL_LOGIN',
        entityType: 'Contact',
        entityId: owner.id,
        metadata: { portal: 'OWNER' },
      },
    });
    await createOwnerSession(owner);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'No se pudo ingresar al portal.' };
  }
}

export async function logoutOwnerAction() {
  await clearOwnerSession();
  redirect('/propietario/login');
}

export async function setOwnerPortalPasswordAction(ownerContactId: string, plainPassword: string, enabled = true) {
  const { tenant, session } = await requireTenantAdmin();
  if (!plainPassword || plainPassword.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');

  const owner = await platformPrisma.contact.findFirst({
    where: {
      id: ownerContactId,
      tenantId: tenant.id,
      archivedAt: null,
      roles: { some: { role: 'OWNER' } },
      ownedProperties: { some: { tenantId: tenant.id } },
    },
    select: { id: true },
  });
  if (!owner) throw new Error('Propietario no encontrado o sin propiedades asignadas.');

  await platformPrisma.contact.update({
    where: { id: owner.id },
    data: { ownerPortalPasswordHash: await hashPassword(plainPassword), ownerPortalEnabled: enabled },
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'OWNER_PORTAL_PASSWORD_CHANGED',
    entityType: 'Contact',
    entityId: owner.id,
    metadata: { enabled },
  });
  revalidatePath('/contactos');
  return { success: true };
}

export async function setOwnerPortalEnabledAction(ownerContactId: string, enabled: boolean) {
  const { tenant, session } = await requireTenantAdmin();
  const result = await platformPrisma.contact.updateMany({
    where: {
      id: ownerContactId,
      tenantId: tenant.id,
      archivedAt: null,
      roles: { some: { role: 'OWNER' } },
    },
    data: { ownerPortalEnabled: enabled },
  });
  if (!result.count) throw new Error('Propietario no encontrado.');

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: enabled ? 'OWNER_PORTAL_ENABLED' : 'OWNER_PORTAL_DISABLED',
    entityType: 'Contact',
    entityId: ownerContactId,
  });
  revalidatePath('/contactos');
  return { success: true };
}

async function requireOwnerPortalSession() {
  const session = await getOwnerSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

export async function getOwnerPortalDataAction() {
  const session = await requireOwnerPortalSession();
  const owner = await platformPrisma.contact.findFirst({
    where: {
      id: session.ownerContactId,
      tenantId: session.tenantId,
      isActive: true,
      archivedAt: null,
      ownerPortalEnabled: true,
      roles: { some: { role: 'OWNER' } },
    },
    include: {
      tenant: true,
      ownedProperties: {
        where: { tenantId: session.tenantId },
        include: {
          property: {
            include: {
              propertyLeases: {
                where: { status: { in: ['CURRENT', 'EXPIRING', 'RENEWED'] } },
                include: { renter: { select: { id: true, firstName: true, lastName: true } } },
                orderBy: { endDate: 'asc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!owner || owner.ownedProperties.length === 0) throw new Error('UNAUTHORIZED');

  const propertyIds = owner.ownedProperties.map((ownership) => ownership.propertyId);
  const ownershipByProperty = new Map(owner.ownedProperties.map((ownership) => [ownership.propertyId, Number(ownership.ownershipPercentage)]));

  const [settlements, expenses, maintenance, documents, payments] = await Promise.all([
    platformPrisma.ownerSettlement.findMany({
      where: { tenantId: session.tenantId, ownerContactId: owner.id },
      include: { lines: { include: { property: { select: { id: true, code: true, address: true } } } } },
      orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
      take: 60,
    }),
    platformPrisma.propertyExpense.findMany({
      where: {
        tenantId: session.tenantId,
        propertyId: { in: propertyIds },
        OR: [{ ownerContactId: owner.id }, { ownerContactId: null, chargeToOwner: true }],
      },
      include: { property: { select: { id: true, code: true, address: true } }, provider: { select: { firstName: true, lastName: true, companyName: true } } },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    platformPrisma.maintenanceRequest.findMany({
      where: { tenantId: session.tenantId, propertyId: { in: propertyIds } },
      include: { property: { select: { id: true, code: true, address: true } }, provider: { select: { firstName: true, lastName: true, companyName: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    platformPrisma.document.findMany({
      where: { tenantId: session.tenantId, propertyId: { in: propertyIds } },
      include: { property: { select: { id: true, code: true } } },
      orderBy: { uploadedAt: 'desc' },
      take: 100,
    }),
    platformPrisma.payment.findMany({
      where: {
        tenantId: session.tenantId,
        debt: {
          tenantId: session.tenantId,
          propertyLease: { propertyId: { in: propertyIds } },
        },
      },
      include: {
        debt: {
          include: {
            propertyLease: {
              include: {
                property: { select: { id: true, code: true, address: true } },
                renter: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 100,
    }),
  ]);

  const ownerPayments = payments.map((payment) => {
    const propertyId = payment.debt.propertyLease?.propertyId;
    const ownership = propertyId ? (ownershipByProperty.get(propertyId) || 0) : 0;
    return {
      ...payment,
      amount: Number(payment.amount),
      ownershipPercentage: ownership,
      ownerShare: Number(payment.amount) * ownership / 100,
    };
  });

  return {
    owner: {
      id: owner.id,
      name: owner.companyName || `${owner.firstName} ${owner.lastName}`.trim(),
      email: owner.email,
      phone: owner.phone,
      documentNumber: owner.documentNumber,
      cuit: owner.cuit,
      bankAlias: owner.bankAlias,
      bankCbu: owner.bankCbu,
      tenant: { id: owner.tenant.id, name: owner.tenant.name, logoUrl: owner.tenant.logoUrl },
    },
    properties: owner.ownedProperties.map((ownership) => ({
      ...ownership.property,
      ownershipPercentage: Number(ownership.ownershipPercentage),
      isPrimaryOwner: ownership.isPrimary,
      baseRent: ownership.property.baseRent == null ? null : Number(ownership.property.baseRent),
      rentPrice: ownership.property.rentPrice == null ? null : Number(ownership.property.rentPrice),
      salePrice: ownership.property.salePrice == null ? null : Number(ownership.property.salePrice),
      propertyLeases: ownership.property.propertyLeases.map((lease) => ({
        ...lease,
        currentRent: Number(lease.currentRent),
        deposit: Number(lease.deposit),
        increasePercent: Number(lease.increasePercent),
      })),
    })),
    settlements: settlements.map((settlement) => ({
      ...settlement,
      grossCollected: Number(settlement.grossCollected),
      expensesTotal: Number(settlement.expensesTotal),
      commissionTotal: Number(settlement.commissionTotal),
      taxesTotal: Number(settlement.taxesTotal),
      netAmount: Number(settlement.netAmount),
      lines: settlement.lines.map((line) => ({ ...line, amount: Number(line.amount) })),
    })),
    expenses: expenses.map((expense) => ({
      ...expense,
      amount: Number(expense.amount),
      ownerShare: expense.ownerContactId === owner.id ? Number(expense.amount) : Number(expense.amount) * (ownershipByProperty.get(expense.propertyId) || 0) / 100,
    })),
    maintenance: maintenance.map((request) => ({
      ...request,
      quotedAmount: request.quotedAmount == null ? null : Number(request.quotedAmount),
      approvedAmount: request.approvedAmount == null ? null : Number(request.approvedAmount),
      actualCost: request.actualCost == null ? null : Number(request.actualCost),
    })),
    documents,
    payments: ownerPayments,
    metrics: {
      properties: propertyIds.length,
      occupied: owner.ownedProperties.filter((ownership) => ownership.property.propertyLeases.length > 0).length,
      openMaintenance: maintenance.filter((request) => !['RESOLVED', 'CANCELED'].includes(request.status)).length,
      pendingSettlements: settlements.filter((settlement) => ['DRAFT', 'READY'].includes(settlement.status)).length,
      totalOwnerIncome: ownerPayments.reduce((sum, payment) => sum + payment.ownerShare, 0),
      totalSettled: settlements.filter((settlement) => settlement.status === 'PAID').reduce((sum, settlement) => sum + Number(settlement.netAmount), 0),
    },
  };
}
