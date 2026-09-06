'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getRenterSession } from '@/lib/auth';
import { platformPrisma } from '@/lib/prisma-core';
import { isTenantFeatureEnabled } from '@/lib/saas';

async function requireRenterPortalSession() {
  const session = await getRenterSession();
  if (!session) throw new Error('UNAUTHORIZED');
  if (!(await isTenantFeatureEnabled(session.tenantId, 'renter_portal'))) throw new Error('FEATURE_DISABLED');
  return session;
}

export async function getRenterPortalDataAction() {
  const session = await requireRenterPortalSession();

  const renter = await platformPrisma.propertyRenter.findFirst({
    where: { id: session.renterId, tenantId: session.tenantId, status: 'ACTIVE' },
    include: {
      tenant: true,
      propertyLeases: {
        where: { status: { in: ['CURRENT', 'EXPIRING', 'RENEWED'] } },
        include: { property: true },
        orderBy: { endDate: 'asc' },
      },
      garageLeases: {
        where: { status: { in: ['CURRENT', 'EXPIRING', 'RENEWED'] } },
        include: { spaces: { include: { space: { include: { garage: true } } } } },
        orderBy: { endDate: 'asc' },
      },
    },
  });
  if (!renter) throw new Error('UNAUTHORIZED');

  const propertyLeaseIds = renter.propertyLeases.map((lease) => lease.id);
  const propertyIds = renter.propertyLeases.map((lease) => lease.propertyId);

  const [debts, payments, documents, maintenanceRequests] = await Promise.all([
    platformPrisma.debt.findMany({
      where: { tenantId: session.tenantId, renterId: session.renterId },
      orderBy: { dueDate: 'desc' },
      take: 100,
    }),
    platformPrisma.payment.findMany({
      where: { tenantId: session.tenantId, debt: { renterId: session.renterId, tenantId: session.tenantId } },
      include: { debt: { select: { description: true, dueDate: true, propertyLeaseId: true } } },
      orderBy: { paidAt: 'desc' },
      take: 50,
    }),
    platformPrisma.document.findMany({
      where: {
        tenantId: session.tenantId,
        OR: [
          { renterId: session.renterId },
          ...(propertyLeaseIds.length ? [{ propertyLeaseId: { in: propertyLeaseIds } }] : []),
        ],
      },
      orderBy: { uploadedAt: 'desc' },
      take: 100,
    }),
    platformPrisma.maintenanceRequest.findMany({
      where: { tenantId: session.tenantId, renterId: session.renterId },
      include: {
        property: { select: { id: true, code: true, address: true } },
        provider: { select: { firstName: true, lastName: true, companyName: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const now = new Date();
  const pendingDebts = debts.filter((debt) => debt.status !== 'PAID');
  const nextDebt = pendingDebts
    .filter((debt) => new Date(debt.dueDate).getTime() >= now.setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] || null;

  return {
    renter: {
      id: renter.id,
      firstName: renter.firstName,
      lastName: renter.lastName,
      dni: renter.dni,
      email: renter.email,
      phone: renter.phone,
      address: renter.address,
      tenant: { id: renter.tenant.id, name: renter.tenant.name, logoUrl: renter.tenant.logoUrl },
    },
    propertyLeases: renter.propertyLeases.map((lease) => ({
      ...lease,
      currentRent: Number(lease.currentRent),
      deposit: Number(lease.deposit),
      increasePercent: Number(lease.increasePercent),
    })),
    garageLeases: renter.garageLeases.map((lease) => ({
      ...lease,
      rentPerSpace: Number(lease.rentPerSpace),
      totalRent: Number(lease.totalRent),
      deposit: Number(lease.deposit),
      increasePercent: Number(lease.increasePercent),
    })),
    debts: debts.map((debt) => ({ ...debt, amount: Number(debt.amount), paidAmount: Number(debt.paidAmount) })),
    payments: payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
    documents,
    maintenanceRequests: maintenanceRequests.map((request) => ({
      ...request,
      quotedAmount: request.quotedAmount == null ? null : Number(request.quotedAmount),
      approvedAmount: request.approvedAmount == null ? null : Number(request.approvedAmount),
      actualCost: request.actualCost == null ? null : Number(request.actualCost),
    })),
    nextDue: nextDebt ? { id: nextDebt.id, description: nextDebt.description, dueDate: nextDebt.dueDate, amount: Number(nextDebt.amount) - Number(nextDebt.paidAmount) } : null,
    propertyIds,
  };
}

const MaintenanceRequestSchema = z.object({
  propertyId: z.string().min(1),
  category: z.string().trim().min(2).max(80),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(12000),
});

export async function createRenterMaintenanceRequestAction(input: z.input<typeof MaintenanceRequestSchema>) {
  const session = await requireRenterPortalSession();
  const data = MaintenanceRequestSchema.parse(input);

  const lease = await platformPrisma.propertyLease.findFirst({
    where: {
      tenantId: session.tenantId,
      renterId: session.renterId,
      propertyId: data.propertyId,
      status: { in: ['CURRENT', 'EXPIRING', 'RENEWED'] },
    },
    select: { id: true, propertyId: true },
  });
  if (!lease) throw new Error('No tenés un contrato activo para esa propiedad.');

  const request = await platformPrisma.$transaction(async (tx) => {
    const created = await tx.maintenanceRequest.create({
      data: {
        tenantId: session.tenantId,
        propertyId: lease.propertyId,
        propertyLeaseId: lease.id,
        renterId: session.renterId,
        category: data.category,
        priority: data.priority,
        title: data.title,
        description: data.description,
        reportedBy: session.name,
        status: 'OPEN',
      },
    });
    await tx.maintenanceEvent.create({
      data: {
        tenantId: session.tenantId,
        maintenanceRequestId: created.id,
        toStatus: 'OPEN',
        note: 'Solicitud creada por el inquilino desde el portal.',
      },
    });
    return created;
  });

  revalidatePath('/portal');
  revalidatePath('/mantenimiento');
  return { success: true, maintenanceRequestId: request.id };
}

const ProfileSchema = z.object({
  email: z.string().trim().email().max(120).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
});

export async function updateRenterPortalProfileAction(input: z.input<typeof ProfileSchema>) {
  const session = await requireRenterPortalSession();
  const data = ProfileSchema.parse(input);
  await platformPrisma.propertyRenter.updateMany({
    where: { id: session.renterId, tenantId: session.tenantId, status: 'ACTIVE' },
    data: {
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    },
  });
  revalidatePath('/portal');
  return { success: true };
}
