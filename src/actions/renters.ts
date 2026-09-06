'use server';

import { revalidatePath } from 'next/cache';
import { hashPassword } from '@/lib/auth';
import { getTenantPrisma } from '@/lib/prisma';
import { auditTenantAction } from '@/lib/tenant-guard';
import { requirePermission } from '@/lib/permissions';
import { z } from 'zod';

const RenterSchema = z.object({
  firstName: z.string().min(1, 'El nombre es obligatorio').max(80),
  lastName: z.string().min(1, 'El apellido es obligatorio').max(80),
  dni: z.string().min(1, 'El DNI es obligatorio').max(30),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(200).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().max(4000).optional(),
});

export async function getRentersAction(search?: string) {
  const { tenant } = await requirePermission('renters', 'read');
  const prisma = await getTenantPrisma();
  const where: any = { tenantId: tenant.id };
  if (search) where.OR = [{ firstName: { contains: search } }, { lastName: { contains: search } }, { dni: { contains: search } }, { email: { contains: search } }];

  const renters = await prisma.propertyRenter.findMany({
    where,
    include: {
      propertyLeases: { where: { status: { in: ['CURRENT', 'EXPIRING'] } }, include: { property: true } },
      garageLeases: { where: { status: 'CURRENT' } },
      debts: { where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
    },
    orderBy: { lastName: 'asc' },
  });

  return renters.map((renter) => ({
    id: renter.id,
    firstName: renter.firstName,
    lastName: renter.lastName,
    fullName: `${renter.firstName} ${renter.lastName}`,
    dni: renter.dni,
    email: renter.email,
    phone: renter.phone,
    address: renter.address,
    status: renter.status,
    hasPortalAccess: !!renter.portalPasswordHash,
    notes: renter.notes,
    activePropertyLeases: renter.propertyLeases.map((lease) => ({ id: lease.id, propertyCode: lease.property.code, rent: Number(lease.currentRent) })),
    activeGarageLeasesCount: renter.garageLeases.length,
    totalPendingDebt: renter.debts.reduce((sum, debt) => sum + (Number(debt.amount) - Number(debt.paidAmount)), 0),
  }));
}

export async function saveRenterAction(data: {
  id?: string; firstName: string; lastName: string; dni: string; email?: string; phone?: string; address?: string; status?: 'ACTIVE' | 'INACTIVE'; notes?: string;
}) {
  const { tenant, session } = await requirePermission('renters', data.id ? 'update' : 'create');
  const prisma = await getTenantPrisma();
  const validated = RenterSchema.parse(data);
  const payload = {
    firstName: validated.firstName.trim(), lastName: validated.lastName.trim(), dni: validated.dni.trim(),
    email: validated.email?.trim().toLowerCase() || null, phone: validated.phone?.trim() || null,
    address: validated.address?.trim() || null, status: validated.status, notes: validated.notes?.trim() || null,
  };

  const renter = data.id
    ? await prisma.propertyRenter.update({ where: { id: data.id }, data: payload })
    : await prisma.propertyRenter.create({ data: { ...payload, tenantId: tenant.id } });

  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: data.id ? 'RENTER_UPDATED' : 'RENTER_CREATED', entityType: 'PropertyRenter', entityId: renter.id, metadata: { dni: renter.dni } });
  revalidatePath('/inquilinos');
  revalidatePath('/dashboard');
  return { success: true, renterId: renter.id };
}

export async function setRenterPortalPasswordAction(renterId: string, plainPassword: string) {
  const { tenant, session } = await requirePermission('renters', 'manage');
  const prisma = await getTenantPrisma();
  if (!plainPassword || plainPassword.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const renter = await prisma.propertyRenter.findFirst({ where: { id: renterId } });
  if (!renter) throw new Error('Inquilino no encontrado.');

  await prisma.propertyRenter.update({ where: { id: renterId }, data: { portalPasswordHash: await hashPassword(plainPassword) } });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'RENTER_PORTAL_PASSWORD_CHANGED', entityType: 'PropertyRenter', entityId: renterId });
  revalidatePath('/inquilinos');
  return { success: true };
}
