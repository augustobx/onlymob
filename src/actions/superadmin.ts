'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { platformPrisma } from '@/lib/prisma-core';
import { getSuperAdminSession } from '@/lib/auth';
import { clearTenantResolutionCache } from '@/lib/tenant-context';
import { reconcileExpiredMemberships } from '@/lib/membership';

const DEFAULT_ROLE_PERMISSIONS: Record<string, Array<[string, string]>> = {
  OWNER: ['dashboard','properties','garages','leases','collections','renters','contacts','settings','audit']
    .flatMap((module) => ['read','create','update','delete','export','manage'].map((action) => [module, action] as [string, string])),
  AGENT: ['dashboard','properties','renters','contacts']
    .flatMap((module) => ['read','create','update'].map((action) => [module, action] as [string, string])),
};

type InitialSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';

async function requireSuperAdmin() {
  const session = await getSuperAdminSession();
  if (!session || session.role !== 'SUPERADMIN') throw new Error('Acceso no autorizado.');
  return session;
}
function parseDate(value: string | Date | null | undefined, fallback: Date) {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Fecha de membresía inválida.');
  return date;
}

export async function getTenantsAction() {
  await requireSuperAdmin();
  await reconcileExpiredMemberships();

  const tenants = await platformPrisma.tenant.findMany({
    include: {
      domains: true,
      subscriptions: { include: { plan: true }, take: 1, orderBy: { createdAt: 'desc' } },
      _count: { select: { properties: true, garages: true, propertyLeases: true, garageLeases: true, renters: true, users: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const baseDomain = process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar';
  return tenants.map((tenant) => {
    const subscription = tenant.subscriptions[0];
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      domains: [`${tenant.slug}.${baseDomain}`],
      planName: subscription?.plan.name || 'Sin plan asignado',
      planStatus: subscription?.status || 'INACTIVE',
      periodStart: subscription?.currentPeriodStart || null,
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
  planId?: string;
  subscriptionStatus?: InitialSubscriptionStatus;
  currentPeriodStart?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  trialEndsAt?: string | Date | null;
  cuit?: string | null;
  address?: string | null;
  phone?: string | null;
}) {
  const session = await requireSuperAdmin();
  const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (cleanSlug.length < 2) throw new Error('El slug debe tener al menos 2 caracteres.');
  if (!data.name.trim()) throw new Error('El nombre de la inmobiliaria es obligatorio.');
  if (!data.adminEmail.trim()) throw new Error('El email administrador es obligatorio.');
  if (!data.adminPassword || data.adminPassword.length < 12) throw new Error('La contraseña inicial debe tener al menos 12 caracteres.');

  const existing = await platformPrisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing) throw new Error(`El slug "${cleanSlug}" ya está registrado.`);
  const baseDomain = process.env.TENANT_BASE_DOMAIN;
  if (!baseDomain) throw new Error('TENANT_BASE_DOMAIN no está configurado.');

  const passwordHash = await bcrypt.hash(data.adminPassword, 12);
  const plan = data.planId
    ? await platformPrisma.plan.findFirst({ where: { id: data.planId, isActive: true } })
    : await platformPrisma.plan.findFirst({ where: { code: data.planCode || 'INMOBILIARIA_PRO', isActive: true } });
  if (!plan) throw new Error('El plan solicitado no existe o está inactivo.');

  const now = new Date();
  const start = parseDate(data.currentPeriodStart, now);
  const defaultEnd = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const end = parseDate(data.currentPeriodEnd, defaultEnd);
  if (end.getTime() <= start.getTime()) throw new Error('El vencimiento debe ser posterior a la fecha de alta.');
  const subscriptionStatus = data.subscriptionStatus || 'ACTIVE';
  const trialEndsAt = subscriptionStatus === 'TRIAL' ? parseDate(data.trialEndsAt, end) : null;
  const tenantStatus = ['SUSPENDED', 'CANCELED'].includes(subscriptionStatus) ? 'SUSPENDED' : 'ACTIVE';

  const tenant = await platformPrisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        slug: cleanSlug,
        name: data.name.trim(),
        status: tenantStatus,
        cuit: data.cuit?.trim() || null,
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
      },
    });
    await tx.tenantDomain.create({ data: { tenantId: created.id, hostname: `${cleanSlug}.${baseDomain}`, isPrimary: true, verifiedAt: new Date() } });

    const ownerRole = await tx.roleProfile.create({ data: { tenantId: created.id, key: 'OWNER', name: 'Propietario / Administrador', description: 'Acceso total a la inmobiliaria', isSystem: true } });
    await tx.rolePermission.createMany({ data: DEFAULT_ROLE_PERMISSIONS.OWNER.map(([module, action]) => ({ roleId: ownerRole.id, module, action })) });
    const agentRole = await tx.roleProfile.create({ data: { tenantId: created.id, key: 'AGENT', name: 'Agente', description: 'Gestión comercial y de propiedades', isSystem: true } });
    await tx.rolePermission.createMany({ data: DEFAULT_ROLE_PERMISSIONS.AGENT.map(([module, action]) => ({ roleId: agentRole.id, module, action })) });
    await tx.user.create({ data: { tenantId: created.id, roleProfileId: ownerRole.id, email: data.adminEmail.trim().toLowerCase(), name: data.adminName.trim(), passwordHash, role: 'ADMIN', isActive: true } });
    const subscription = await tx.tenantSubscription.create({ data: { tenantId: created.id, planId: plan.id, status: subscriptionStatus, currentPeriodStart: start, currentPeriodEnd: end, trialEndsAt } });
    await tx.auditLog.create({ data: { tenantId: created.id, actorType: 'SUPERADMIN', action: 'TENANT_PROVISIONED', entityType: 'Tenant', entityId: created.id, metadata: { superAdminId: session.superAdminId, planCode: plan.code, subscriptionId: subscription.id, currentPeriodStart: start.toISOString(), currentPeriodEnd: end.toISOString() } } });
    return created;
  });

  clearTenantResolutionCache();
  revalidatePath('/superadmin');
  revalidatePath('/superadmin/tenants');
  return { success: true, tenantId: tenant.id, domain: `${cleanSlug}.${baseDomain}` };
}

export async function toggleTenantStatusAction(tenantId: string, status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED') {
  const session = await requireSuperAdmin();
  const tenant = await platformPrisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, status: true } });
  if (!tenant) throw new Error('Tenant inexistente.');

  await platformPrisma.$transaction(async (tx) => {
    await tx.tenant.update({ where: { id: tenantId }, data: { status, archivedAt: status === 'ARCHIVED' ? new Date() : null } });
    await tx.auditLog.create({ data: { tenantId, actorType: 'SUPERADMIN', action: 'TENANT_STATUS_CHANGED', entityType: 'Tenant', entityId: tenantId, metadata: { fromStatus: tenant.status, toStatus: status, superAdminId: session.superAdminId } } });
  });

  clearTenantResolutionCache();
  revalidatePath('/superadmin');
  revalidatePath('/superadmin/tenants');
  revalidatePath(`/superadmin/tenants/${tenantId}`);
  return { success: true };
}
