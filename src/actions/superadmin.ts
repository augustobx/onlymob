'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { platformPrisma } from '@/lib/prisma-core';
import { getSuperAdminSession } from '@/lib/auth';

export async function getTenantsAction() {
  const session = await getSuperAdminSession();
  if (!session) throw new Error('Acceso no autorizado al plano de plataforma.');

  const tenants = await platformPrisma.tenant.findMany({
    include: {
      domains: true,
      subscriptions: {
        include: { plan: true },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          properties: true,
          garages: true,
          propertyLeases: true,
          garageLeases: true,
          renters: true,
          users: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return tenants.map((t) => {
    const sub = t.subscriptions[0];
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      domains: t.domains.map((d) => d.hostname),
      planName: sub?.plan.name || 'Sin plan asignado',
      planStatus: sub?.status || 'INACTIVE',
      periodEnd: sub?.currentPeriodEnd || null,
      createdAt: t.createdAt,
      stats: {
        properties: t._count.properties,
        garages: t._count.garages,
        propertyLeases: t._count.propertyLeases,
        garageLeases: t._count.garageLeases,
        renters: t._count.renters,
        users: t._count.users,
      },
    };
  });
}

export async function createTenantAction(data: {
  slug: string;
  name: string;
  adminEmail: string;
  adminName: string;
  adminPassword?: string;
  planCode?: string;
}) {
  const session = await getSuperAdminSession();
  if (!session) throw new Error('Acceso no autorizado.');

  const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  const existing = await platformPrisma.tenant.findUnique({
    where: { slug: cleanSlug },
  });
  if (existing) throw new Error(`El slug "${cleanSlug}" ya está registrado.`);

  // 1. Crear tenant
  const tenant = await platformPrisma.tenant.create({
    data: {
      slug: cleanSlug,
      name: data.name.trim(),
      status: 'ACTIVE',
    },
  });

  // 2. Crear subdominio por defecto
  const baseDomain = process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar';
  await platformPrisma.tenantDomain.create({
    data: {
      tenantId: tenant.id,
      hostname: `${cleanSlug}.${baseDomain}`,
      isPrimary: true,
      verifiedAt: new Date(),
    },
  });

  // 3. Crear usuario admin del tenant
  const passwordHash = await bcrypt.hash(data.adminPassword || 'Admin2026!', 10);
  await platformPrisma.user.create({
    data: {
      tenantId: tenant.id,
      email: data.adminEmail.trim().toLowerCase(),
      name: data.adminName.trim(),
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  // 4. Asignar plan
  const plan = await platformPrisma.plan.findFirst({
    where: { code: data.planCode || 'INMOBILIARIA_PRO' },
  });
  if (plan) {
    await platformPrisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  revalidatePath('/superadmin');
  return { success: true, tenantId: tenant.id };
}

export async function toggleTenantStatusAction(tenantId: string, status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED') {
  const session = await getSuperAdminSession();
  if (!session) throw new Error('Acceso no autorizado.');

  await platformPrisma.tenant.update({
    where: { id: tenantId },
    data: { status },
  });

  revalidatePath('/superadmin');
  return { success: true };
}
