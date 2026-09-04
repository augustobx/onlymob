'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction, requireTenantAdmin } from '@/lib/tenant-guard';
import { z } from 'zod';

const GarageSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(120),
  address: z.string().min(3, 'La dirección es obligatoria').max(255),
  totalSpaces: z.number().int().min(0).max(5000),
});

export async function getGaragesAction() {
  const { tenant } = await requireTenantAdmin();

  const garages = await platformPrisma.garage.findMany({
    where: { tenantId: tenant.id },
    include: {
      spaces: {
        orderBy: { spaceNumber: 'asc' },
        include: {
          leaseSpaces: {
            where: { lease: { tenantId: tenant.id, status: 'CURRENT' } },
            include: { lease: { include: { renter: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { address: 'asc' },
  });

  return garages.map((g) => {
    const occupied = g.spaces.filter((s) => s.status === 'OCCUPIED').length;
    const free = g.spaces.filter((s) => s.status === 'FREE').length;

    return {
      id: g.id,
      name: g.name,
      address: g.address,
      totalSpaces: g.spaces.length,
      occupied,
      free,
      spaces: g.spaces.map((s) => {
        const activeLeaseSpace = s.leaseSpaces[0];
        return {
          id: s.id,
          spaceNumber: s.spaceNumber,
          status: s.status,
          renterName: activeLeaseSpace
            ? `${activeLeaseSpace.lease.renter.firstName} ${activeLeaseSpace.lease.renter.lastName}`
            : null,
          leaseId: activeLeaseSpace?.lease.id || null,
        };
      }),
    };
  });
}

export async function saveGarageAction(data: {
  id?: string;
  name: string;
  address: string;
  totalSpaces: number;
}) {
  const { tenant, session } = await requireTenantAdmin();
  const validated = GarageSchema.parse(data);

  const garage = await platformPrisma.$transaction(async (tx) => {
    if (!data.id) {
      const created = await tx.garage.create({
        data: {
          tenantId: tenant.id,
          name: validated.name,
          address: validated.address,
          totalSpaces: validated.totalSpaces,
        },
      });

      if (validated.totalSpaces > 0) {
        await tx.garageSpace.createMany({
          data: Array.from({ length: validated.totalSpaces }, (_, i) => ({
            garageId: created.id,
            spaceNumber: String(i + 1),
            status: 'FREE' as const,
          })),
        });
      }
      return created;
    }

    const existing = await tx.garage.findFirst({
      where: { id: data.id, tenantId: tenant.id },
      include: { spaces: { include: { leaseSpaces: { where: { lease: { status: 'CURRENT' } } } } } },
    });
    if (!existing) throw new Error('Cochera no encontrada.');

    const currentCount = existing.spaces.length;
    if (validated.totalSpaces > currentCount) {
      const usedNumbers = new Set(existing.spaces.map((s) => s.spaceNumber));
      const rows: { garageId: string; spaceNumber: string; status: 'FREE' }[] = [];
      let candidate = 1;
      while (rows.length < validated.totalSpaces - currentCount) {
        const value = String(candidate++);
        if (!usedNumbers.has(value)) rows.push({ garageId: existing.id, spaceNumber: value, status: 'FREE' });
      }
      await tx.garageSpace.createMany({ data: rows });
    } else if (validated.totalSpaces < currentCount) {
      const removable = existing.spaces
        .filter((s) => s.status !== 'OCCUPIED' && s.leaseSpaces.length === 0)
        .slice(0, currentCount - validated.totalSpaces);

      if (removable.length !== currentCount - validated.totalSpaces) {
        throw new Error('No se puede reducir la capacidad porque hay plazas ocupadas o asociadas a contratos.');
      }

      await tx.garageSpace.deleteMany({
        where: { id: { in: removable.map((s) => s.id) }, garageId: existing.id },
      });
    }

    return tx.garage.update({
      where: { id: existing.id },
      data: {
        name: validated.name,
        address: validated.address,
        totalSpaces: validated.totalSpaces,
      },
    });
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: data.id ? 'GARAGE_UPDATED' : 'GARAGE_CREATED',
    entityType: 'Garage',
    entityId: garage.id,
    metadata: { totalSpaces: validated.totalSpaces },
  });

  revalidatePath('/cocheras');
  revalidatePath('/dashboard');
  return { success: true, garageId: garage.id };
}

export async function toggleSpaceStatusAction(spaceId: string, status: 'FREE' | 'OCCUPIED' | 'MAINTENANCE') {
  const { tenant, session } = await requireTenantAdmin();

  const space = await platformPrisma.garageSpace.findFirst({
    where: { id: spaceId, garage: { tenantId: tenant.id } },
    include: {
      leaseSpaces: { where: { lease: { tenantId: tenant.id, status: 'CURRENT' } }, take: 1 },
    },
  });
  if (!space) throw new Error('Plaza no encontrada.');
  if (space.leaseSpaces.length > 0 && status !== 'OCCUPIED') {
    throw new Error('La plaza tiene un contrato vigente y debe permanecer ocupada.');
  }

  await platformPrisma.garageSpace.update({ where: { id: space.id }, data: { status } });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'GARAGE_SPACE_STATUS_CHANGED',
    entityType: 'GarageSpace',
    entityId: space.id,
    metadata: { status },
  });

  revalidatePath('/cocheras');
  revalidatePath('/dashboard');
  return { success: true };
}
