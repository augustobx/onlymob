'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { getTenantPrisma, platformPrisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';
import { z } from 'zod';

const RenterSchema = z.object({
  firstName: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().min(1, 'El apellido es obligatorio'),
  dni: z.string().min(1, 'El DNI es obligatorio'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().optional(),
});

export async function getRentersAction(search?: string) {
  const tenant = await resolveTenantContext();
  const prisma = await getTenantPrisma();

  const where: any = { tenantId: tenant.id };

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { dni: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const renters = await prisma.propertyRenter.findMany({
    where,
    include: {
      propertyLeases: {
        where: { status: 'CURRENT' },
        include: { property: true },
      },
      garageLeases: {
        where: { status: 'CURRENT' },
      },
      debts: {
        where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      },
    },
    orderBy: { lastName: 'asc' },
  });

  return renters.map((r) => {
    const totalPendingDebt = r.debts.reduce(
      (sum, d) => sum + (Number(d.amount) - Number(d.paidAmount)),
      0
    );

    return {
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      fullName: `${r.firstName} ${r.lastName}`,
      dni: r.dni,
      email: r.email,
      phone: r.phone,
      address: r.address,
      status: r.status,
      hasPortalAccess: !!r.portalPasswordHash,
      notes: r.notes,
      activePropertyLeases: r.propertyLeases.map((l) => ({
        id: l.id,
        propertyCode: l.property.code,
        rent: Number(l.currentRent),
      })),
      activeGarageLeasesCount: r.garageLeases.length,
      totalPendingDebt,
    };
  });
}

export async function saveRenterAction(data: {
  id?: string;
  firstName: string;
  lastName: string;
  dni: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  notes?: string;
}) {
  const tenant = await resolveTenantContext();
  const validated = RenterSchema.parse(data);

  if (data.id) {
    await platformPrisma.propertyRenter.update({
      where: { id: data.id },
      data: {
        firstName: validated.firstName,
        lastName: validated.lastName,
        dni: validated.dni,
        email: validated.email || null,
        phone: validated.phone || null,
        address: validated.address || null,
        status: validated.status,
        notes: validated.notes,
      },
    });
  } else {
    await platformPrisma.propertyRenter.create({
      data: {
        tenantId: tenant.id,
        firstName: validated.firstName,
        lastName: validated.lastName,
        dni: validated.dni,
        email: validated.email || null,
        phone: validated.phone || null,
        address: validated.address || null,
        status: validated.status,
        notes: validated.notes,
      },
    });
  }

  revalidatePath('/inquilinos');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function setRenterPortalPasswordAction(renterId: string, plainPassword: string) {
  const tenant = await resolveTenantContext();

  if (!plainPassword || plainPassword.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  const hash = await bcrypt.hash(plainPassword, 10);

  await platformPrisma.propertyRenter.update({
    where: { id: renterId },
    data: { portalPasswordHash: hash },
  });

  revalidatePath('/inquilinos');
  return { success: true };
}
