'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { platformPrisma } from '@/lib/prisma-core';
import { getSuperAdminSession } from '@/lib/auth';
import { clearTenantResolutionCache } from '@/lib/tenant-context';

const DEFAULT_ROLE_PERMISSIONS: Record<string, Array<[string, string]>> = {
  OWNER: ['dashboard','properties','garages','leases','collections','renters','contacts','settings','audit']
    .flatMap((module) => ['read','create','update','delete','export','manage'].map((action) => [module, action] as [string, string])),
  AGENT: ['dashboard','properties','renters','contacts']
    .flatMap((module) => ['read','create','update'].map((action) => [module, action] as [string, string])),
};

export async function getTenantsAction() {
  const session = await getSuperAdminSession();
  if (!session) throw new Error('Acceso no autorizado al plano de plataforma.');

  const tenants = await platformPrisma.tenant.findMany({
    include: {
      domains: true,
      subscriptions: { include: { plan: true }, take: 1, orderBy: { createdAt: 'desc' } },
      _count: {
        select: { properties: true, garages: true, propertyLeases: true, garageLeases: true, renters: true, users: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return tenants.map((tenant) => {
    const subscription = tenant.subscriptions[0];
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      domains: tenant.domains.map((domain) => domain.hostname),
      planName: subscription?.plan.name || 'Sin plan asignado',
      planStatus: subscription?.status || 'INACTIVE',
      periodEnd: subscription?.currentPeriodEnd || null,
      createdAt: tenant.createdAt,
      stats: {
        properties: tenant._count.properties,
        garages: tenant._count.garages,
        propertyLeases: tenant._count.propertyLeases,
        garageLeases: tenant._count.garageLeases,
        renters: tenant._count.renters,
        users: tenant._count.users,
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
  if (!session || session.role !== 'SUPERADMIN') throw new Error('Acceso no autorizado.');

  const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (cleanSlug.length < 2) throw new Error('El slug debe tener al menos 2 caracteres.');
  if (!data.name.trim()) throw new Error('El nombre de la inmobiliaria es obligatorio.');
  if (!data.adminEmail.trim()) throw new Error('El email administrador es obligatorio.');
  if (!data.adminPassword || data.adminPassword.length < 12) {
    throw new Error('La contraseña inicial debe tener al menos 12 caracteres.');
  }

  const existing = await platformPrisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing) throw new Error(`El slug "${cleanSlug}" ya está registrado.`);

  const baseDomain = process.env.TENANT_BASE_DOMAIN;
  if (!baseDomain) throw new Error('TENANT_BASE_DOMAIN no está configurado.');

  const passwordHash = await bcrypt.hash(data.adminPassword, 12);
  const plan = await platformPrisma.plan.findFirst({ where: { code: data.planCode || 'INMOBILIARIA_PRO', isActive: true } });
  if (!plan) throw new Error('El plan solicitado no existe o está inactivo.');

  const tenant = await platformPrisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: { slug: cleanSlug, name: data.name.trim(), status: 'ACTIVE' },
    });

    await tx.tenantDomain.create({
      data: {
        tenantId: created.id,
        hostname: `${cleanSlug}.${baseDomain}`,
        isPrimary: true,
        verifiedAt: new Date(),
      },
    });

    const ownerRole = await tx.roleProfile.create({
      data: {
        tenantId: created.id,
        key: 'OWNER',
        name: 'Propietario / Administrador',
        description: 'Acceso total a la inmobiliaria',
        isSystem: true,
      },
    });

    await tx.rolePermission.createMany({
      data: DEFAULT_ROLE_PERMISSIONS.OWNER.map(([module, action]) => ({ roleId: ownerRole.id, module, action })),
    });

    const agentRole = await tx.roleProfile.create({
      data: {
        tenantId: created.id,
        key: 'AGENT',
        name: 'Agente',
        description: 'Gestión comercial y de propiedades',
        isSystem: true,
      },
    });

    await tx.rolePermission.createMany({
      data: DEFAULT_ROLE_PERMISSIONS.AGENT.map(([module, action]) => ({ roleId: agentRole.id, module, action })),
    });

    await tx.user.create({
      data: {
        tenantId: created.id,
        roleProfileId: ownerRole.id,
        email: data.adminEmail.trim().toLowerCase(),
        name: data.adminName.trim(),
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    const subscription = await tx.tenantSubscription.create({
      data: {
        tenantId: created.id,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: created.id,
        actorType: 'SUPERADMIN',
        action: 'TENANT_PROVISIONED',
        entityType: 'Tenant',
        entityId: created.id,
        metadata: { superAdminId: session.superAdminId, planCode: plan.code, subscriptionId: subscription.id },
      },
    });

    return created;
  });

  clearTenantResolutionCache();
  revalidatePath('/superadmin');
  return { success: true, tenantId: tenant.id };
}

export async function toggleTenantStatusAction(tenantId: string, status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED') {
  const session = await getSuperAdminSession();
  if (!session || session.role !== 'SUPERADMIN') throw new Error('Acceso no autorizado.');

  const tenant = await platformPrisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, status: true } });
  if (!tenant) throw new Error('Tenant inexistente.');

  await platformPrisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { status, archivedAt: status === 'ARCHIVED' ? new Date() : null },
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: 'SUPERADMIN',
        action: 'TENANT_STATUS_CHANGED',
        entityType: 'Tenant',
        entityId: tenantId,
        metadata: { fromStatus: tenant.status, toStatus: status, superAdminId: session.superAdminId },
      },
    });
  });

  clearTenantResolutionCache();
  revalidatePath('/superadmin');
  return { success: true };
}
