'use server';

import { revalidatePath } from 'next/cache';
import { getTenantPrisma, platformPrisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';
import { z } from 'zod';

export async function getGaragesAction() {
  const tenant = await resolveTenantContext();
  const prisma = await getTenantPrisma();

  const garages = await prisma.garage.findMany({
    where: { tenantId: tenant.id },
    include: {
      spaces: {
        orderBy: { spaceNumber: 'asc' },
        include: {
          leaseSpaces: {
            where: { lease: { status: 'CURRENT' } },
            include: {
              lease: {
                include: { renter: true },
              },
            },
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
      totalSpaces: g.totalSpaces,
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
  const tenant = await resolveTenantContext();

  if (data.id) {
    await platformPrisma.garage.update({
      where: { id: data.id },
      data: {
        name: data.name,
        address: data.address,
        totalSpaces: data.totalSpaces,
      },
    });
  } else {
    const garage = await platformPrisma.garage.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        address: data.address,
        totalSpaces: data.totalSpaces,
      },
    });

    // Auto-crear plazas numeradas 1 a totalSpaces
    if (data.totalSpaces > 0) {
      const spacesData = Array.from({ length: data.totalSpaces }, (_, i) => ({
        garageId: garage.id,
        spaceNumber: String(i + 1),
        status: 'FREE' as const,
      }));

      await platformPrisma.garageSpace.createMany({
        data: spacesData,
      });
    }
  }

  revalidatePath('/cocheras');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function toggleSpaceStatusAction(spaceId: string, status: 'FREE' | 'OCCUPIED' | 'MAINTENANCE') {
  await platformPrisma.garageSpace.update({
    where: { id: spaceId },
    data: { status },
  });

  revalidatePath('/cocheras');
  revalidatePath('/dashboard');
  return { success: true };
}
