'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction } from '@/lib/tenant-guard';
import { requirePermission } from '@/lib/permissions';
import { assertTenantPlanLimit } from '@/lib/saas';
import { z } from 'zod';

const GarageSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(120),
  address: z.string().min(3, 'La dirección es obligatoria').max(255),
  totalSpaces: z.number().int().min(0).max(5000),
});

export async function getGaragesAction() {
  const { tenant } = await requirePermission('garages', 'read');
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

  return garages.map((garage) => ({
    id: garage.id,
    name: garage.name,
    address: garage.address,
    totalSpaces: garage.spaces.length,
    occupied: garage.spaces.filter((space) => space.status === 'OCCUPIED').length,
    free: garage.spaces.filter((space) => space.status === 'FREE').length,
    spaces: garage.spaces.map((space) => {
      const activeLeaseSpace = space.leaseSpaces[0];
      return {
        id: space.id,
        spaceNumber: space.spaceNumber,
        status: space.status,
        renterName: activeLeaseSpace ? `${activeLeaseSpace.lease.renter.firstName} ${activeLeaseSpace.lease.renter.lastName}` : null,
        leaseId: activeLeaseSpace?.lease.id || null,
      };
    }),
  }));
}

export async function saveGarageAction(data: { id?: string; name: string; address: string; totalSpaces: number }) {
  const { tenant, session } = await requirePermission('garages', data.id ? 'update' : 'create');
  const validated = GarageSchema.parse(data);

  if (!data.id) await assertTenantPlanLimit(tenant.id, 'garages');

  const garage = await platformPrisma.$transaction(async (tx) => {
    if (!data.id) {
      const created = await tx.garage.create({ data: { tenantId: tenant.id, ...validated } });
      if (validated.totalSpaces > 0) {
        await tx.garageSpace.createMany({
          data: Array.from({ length: validated.totalSpaces }, (_, index) => ({ garageId: created.id, spaceNumber: String(index + 1), status: 'FREE' as const })),
        });
      }
      return created;
    }

    const existing = await tx.garage.findFirst({
      where: { id: data.id, tenantId: tenant.id },
      include: { spaces: { include: { leaseSpaces: { where: { lease: { tenantId: tenant.id, status: 'CURRENT' } } } } } },
    });
    if (!existing) throw new Error('Cochera no encontrada.');

    const currentCount = existing.spaces.length;
    if (validated.totalSpaces > currentCount) {
      const usedNumbers = new Set(existing.spaces.map((space) => space.spaceNumber));
      const rows: { garageId: string; spaceNumber: string; status: 'FREE' }[] = [];
      let candidate = 1;
      while (rows.length < validated.totalSpaces - currentCount) {
        const value = String(candidate++);
        if (!usedNumbers.has(value)) rows.push({ garageId: existing.id, spaceNumber: value, status: 'FREE' });
      }
      await tx.garageSpace.createMany({ data: rows });
    } else if (validated.totalSpaces < currentCount) {
      const removable = existing.spaces
        .filter((space) => space.status !== 'OCCUPIED' && space.leaseSpaces.length === 0)
        .slice(0, currentCount - validated.totalSpaces);
      if (removable.length !== currentCount - validated.totalSpaces) {
        throw new Error('No se puede reducir la capacidad porque hay plazas ocupadas o asociadas a contratos.');
      }
      await tx.garageSpace.deleteMany({ where: { id: { in: removable.map((space) => space.id) }, garageId: existing.id } });
    }

    return tx.garage.update({ where: { id: existing.id }, data: validated });
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
  const { tenant, session } = await requirePermission('garages', 'update');
  const space = await platformPrisma.garageSpace.findFirst({
    where: { id: spaceId, garage: { tenantId: tenant.id } },
    include: { leaseSpaces: { where: { lease: { tenantId: tenant.id, status: 'CURRENT' } }, take: 1 } },
  });
  if (!space) throw new Error('Plaza no encontrada.');
  if (space.leaseSpaces.length > 0 && status !== 'OCCUPIED') throw new Error('La plaza tiene un contrato vigente y debe permanecer ocupada.');

  await platformPrisma.garageSpace.update({ where: { id: space.id }, data: { status } });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'GARAGE_SPACE_STATUS_CHANGED', entityType: 'GarageSpace', entityId: space.id, metadata: { status } });
  revalidatePath('/cocheras');
  revalidatePath('/dashboard');
  return { success: true };
}
