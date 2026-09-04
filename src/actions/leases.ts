'use server';

import { revalidatePath } from 'next/cache';
import { getTenantPrisma, platformPrisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';

export async function getLeasesAction() {
  const tenant = await resolveTenantContext();
  const prisma = await getTenantPrisma();

  const [propertyLeases, garageLeases] = await Promise.all([
    prisma.propertyLease.findMany({
      where: { tenantId: tenant.id },
      include: {
        property: true,
        renter: true,
        debts: {
          where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.garageLease.findMany({
      where: { tenantId: tenant.id },
      include: {
        renter: true,
        spaces: {
          include: {
            space: {
              include: { garage: true },
            },
          },
        },
        debts: {
          where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    propertyLeases: propertyLeases.map((l) => ({
      id: l.id,
      propertyId: l.propertyId,
      propertyCode: l.property.code,
      propertyAddress: l.property.address,
      renterId: l.renterId,
      renterName: `${l.renter.firstName} ${l.renter.lastName}`,
      startDate: l.startDate,
      endDate: l.endDate,
      currentRent: Number(l.currentRent),
      deposit: Number(l.deposit),
      increasePercent: Number(l.increasePercent),
      updatePeriodMonths: l.updatePeriodMonths,
      status: l.status,
      pendingDebtTotal: l.debts.reduce((sum, d) => sum + (Number(d.amount) - Number(d.paidAmount)), 0),
    })),
    garageLeases: garageLeases.map((gl) => ({
      id: gl.id,
      renterId: gl.renterId,
      renterName: `${gl.renter.firstName} ${gl.renter.lastName}`,
      startDate: gl.startDate,
      endDate: gl.endDate,
      totalRent: Number(gl.totalRent),
      deposit: Number(gl.deposit),
      increasePercent: Number(gl.increasePercent),
      status: gl.status,
      spacesCount: gl.spaces.length,
      spacesDescription: gl.spaces.map((s) => `#${s.space.spaceNumber}`).join(', '),
      pendingDebtTotal: gl.debts.reduce((sum, d) => sum + (Number(d.amount) - Number(d.paidAmount)), 0),
    })),
  };
}

export async function createPropertyLeaseAction(data: {
  propertyId: string;
  renterId: string;
  startDate: string;
  endDate: string;
  rent: number;
  deposit?: number;
  updatePeriodMonths?: number;
  notes?: string;
}) {
  const tenant = await resolveTenantContext();

  const lease = await platformPrisma.propertyLease.create({
    data: {
      tenantId: tenant.id,
      propertyId: data.propertyId,
      renterId: data.renterId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      currentRent: data.rent,
      deposit: data.deposit || 0,
      updatePeriodMonths: data.updatePeriodMonths || 4,
      status: 'CURRENT',
      notes: data.notes,
    },
  });

  // Marcar la propiedad como ALQUILADO
  await platformPrisma.property.update({
    where: { id: data.propertyId },
    data: { status: 'ALQUILADO' },
  });

  revalidatePath('/contratos');
  revalidatePath('/propiedades');
  revalidatePath('/dashboard');
  return { success: true, leaseId: lease.id };
}

export async function createGarageLeaseAction(data: {
  renterId: string;
  spaceIds: string[];
  startDate: string;
  endDate: string;
  rentPerSpace: number;
  totalRent: number;
  deposit?: number;
  notes?: string;
}) {
  const tenant = await resolveTenantContext();

  const lease = await platformPrisma.garageLease.create({
    data: {
      tenantId: tenant.id,
      renterId: data.renterId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      rentPerSpace: data.rentPerSpace,
      totalRent: data.totalRent,
      deposit: data.deposit || 0,
      status: 'CURRENT',
      notes: data.notes,
    },
  });

  // Asociar plazas y marcarlas como OCCUPIED
  for (const spaceId of data.spaceIds) {
    await platformPrisma.garageLeaseSpace.create({
      data: {
        leaseId: lease.id,
        spaceId,
      },
    });

    await platformPrisma.garageSpace.update({
      where: { id: spaceId },
      data: { status: 'OCCUPIED' },
    });
  }

  revalidatePath('/contratos');
  revalidatePath('/cocheras');
  revalidatePath('/dashboard');
  return { success: true, leaseId: lease.id };
}

export async function terminateLeaseAction(id: string, type: 'PROPERTY' | 'GARAGE') {
  const tenant = await resolveTenantContext();

  if (type === 'PROPERTY') {
    const lease = await platformPrisma.propertyLease.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!lease) throw new Error('Contrato no encontrado.');

    await platformPrisma.propertyLease.update({
      where: { id },
      data: { status: 'TERMINATED' },
    });

    // Liberar la propiedad
    await platformPrisma.property.update({
      where: { id: lease.propertyId },
      data: { status: 'DISPONIBLE' },
    });
  } else {
    const lease = await platformPrisma.garageLease.findFirst({
      where: { id, tenantId: tenant.id },
      include: { spaces: true },
    });
    if (!lease) throw new Error('Contrato de cochera no encontrado.');

    await platformPrisma.garageLease.update({
      where: { id },
      data: { status: 'TERMINATED' },
    });

    // Liberar las plazas asignadas
    for (const s of lease.spaces) {
      await platformPrisma.garageSpace.update({
        where: { id: s.spaceId },
        data: { status: 'FREE' },
      });
    }
  }

  revalidatePath('/contratos');
  revalidatePath('/propiedades');
  revalidatePath('/cocheras');
  revalidatePath('/dashboard');
  return { success: true };
}

// ==========================================
// PREVIEW & APLICAR AUMENTO (IPC / ICL)
// ==========================================
export async function previewIncreaseAction(updatePeriodMonths: number, percent: number) {
  const tenant = await resolveTenantContext();

  const where: any = {
    tenantId: tenant.id,
    status: 'CURRENT',
  };

  if (updatePeriodMonths > 0) {
    where.updatePeriodMonths = updatePeriodMonths;
  }

  const leases = await platformPrisma.propertyLease.findMany({
    where,
    include: {
      property: true,
      renter: true,
    },
    orderBy: { property: { code: 'asc' } },
  });

  return leases.map((l) => {
    const oldRent = Number(l.currentRent);
    const newRent = Math.round(oldRent * (1 + percent / 100) * 100) / 100;
    const diff = newRent - oldRent;

    return {
      leaseId: l.id,
      propertyCode: l.property.code,
      renterName: `${l.renter.firstName} ${l.renter.lastName}`,
      updatePeriodMonths: l.updatePeriodMonths,
      oldRent,
      newRent,
      diff,
      percent,
    };
  });
}

export async function applyIncreaseAction(updatePeriodMonths: number, percent: number, indexUsed: string = 'ICL / Ajuste') {
  const tenant = await resolveTenantContext();

  const where: any = {
    tenantId: tenant.id,
    status: 'CURRENT',
  };

  if (updatePeriodMonths > 0) {
    where.updatePeriodMonths = updatePeriodMonths;
  }

  const leases = await platformPrisma.propertyLease.findMany({ where });

  for (const l of leases) {
    const oldRent = Number(l.currentRent);
    const newRent = Math.round(oldRent * (1 + percent / 100) * 100) / 100;

    // Registrar historial inmutable
    await platformPrisma.rentHistory.create({
      data: {
        propertyLeaseId: l.id,
        changeDate: new Date(),
        oldRent,
        newRent,
        percent,
        indexUsed,
      },
    });

    // Actualizar contrato
    await platformPrisma.propertyLease.update({
      where: { id: l.id },
      data: {
        currentRent: newRent,
        increasePercent: 0,
      },
    });
  }

  revalidatePath('/contratos');
  revalidatePath('/propiedades');
  revalidatePath('/dashboard');
  return { success: true, count: leases.length };
}

// ==========================================
// GENERACIÓN MASIVA DE CUOTAS MENSUALES
// ==========================================
export async function generateMonthlyQuotasAction(periodStr: string, dueDay: number = 10) {
  const tenant = await resolveTenantContext();

  // periodStr viene como 'YYYY-MM', ej: '2026-09'
  const [yearStr, monthStr] = periodStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const dueDate = new Date(year, month - 1, dueDay);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const monthName = monthNames[month - 1] || 'Mes';
  const descPrefix = `Alquiler ${monthName} ${year}`;

  let createdCount = 0;

  // 1. Contratos de Inmuebles activos
  const propertyLeases = await platformPrisma.propertyLease.findMany({
    where: { tenantId: tenant.id, status: 'CURRENT' },
  });

  for (const l of propertyLeases) {
    const description = `${descPrefix}`;

    // Verificar si ya existe la cuota para este contrato y periodo (Idempotencia)
    const existing = await platformPrisma.debt.findFirst({
      where: {
        tenantId: tenant.id,
        propertyLeaseId: l.id,
        type: 'ALQUILER',
        description,
      },
    });

    if (!existing) {
      await platformPrisma.debt.create({
        data: {
          tenantId: tenant.id,
          leaseType: 'PROPERTY',
          propertyLeaseId: l.id,
          renterId: l.renterId,
          type: 'ALQUILER',
          description,
          amount: l.currentRent,
          dueDate,
          paidAmount: 0,
          status: 'PENDING',
        },
      });
      createdCount++;
    }
  }

  // 2. Contratos de Cocheras activos
  const garageLeases = await platformPrisma.garageLease.findMany({
    where: { tenantId: tenant.id, status: 'CURRENT' },
    include: { spaces: true },
  });

  for (const gl of garageLeases) {
    const description = `${descPrefix} (${gl.spaces.length} plaza/s)`;

    const existing = await platformPrisma.debt.findFirst({
      where: {
        tenantId: tenant.id,
        garageLeaseId: gl.id,
        type: 'ALQUILER',
        description,
      },
    });

    if (!existing) {
      await platformPrisma.debt.create({
        data: {
          tenantId: tenant.id,
          leaseType: 'GARAGE',
          garageLeaseId: gl.id,
          renterId: gl.renterId,
          type: 'ALQUILER',
          description,
          amount: gl.totalRent,
          dueDate,
          paidAmount: 0,
          status: 'PENDING',
        },
      });
      createdCount++;
    }
  }

  revalidatePath('/cobranzas');
  revalidatePath('/contratos');
  revalidatePath('/dashboard');
  return { success: true, createdCount };
}
