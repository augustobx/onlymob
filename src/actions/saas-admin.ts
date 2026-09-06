'use server';

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { getSuperAdminSession } from '@/lib/auth';
import { getTenantEntitlements, getTenantFeatureFlags, getTenantUsage } from '@/lib/saas';
import { SAAS_FEATURES, SAAS_FEATURE_KEYS, isSaasFeatureKey, type SaasFeatureKey } from '@/lib/feature-catalog';
import { subscriptionStatusAllowsAccess } from '@/lib/saas-policy';
import { clearTenantResolutionCache } from '@/lib/tenant-context';
import { reconcileExpiredMemberships, reconcileTenantMembership } from '@/lib/membership';

export type PlatformSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';
export type TenantFeatureState = 'INHERIT' | 'ENABLED' | 'DISABLED';

function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
async function requireSuper() {
  const session = await getSuperAdminSession();
  if (!session || session.role !== 'SUPERADMIN') throw new Error('Acceso no autorizado.');
  return session;
}
function toDate(value: string | Date | null | undefined, fallback?: Date) {
  if (!value) return fallback || null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Fecha inválida.');
  return date;
}
function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const last = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, last));
  return result;
}
function serializeEntitlement(entitlement: Awaited<ReturnType<typeof getTenantEntitlements>>) {
  if (!entitlement) return null;
  return {
    ...entitlement,
    currentPeriodStart: entitlement.currentPeriodStart.toISOString(),
    currentPeriodEnd: entitlement.currentPeriodEnd.toISOString(),
    trialEndsAt: entitlement.trialEndsAt?.toISOString() || null,
  };
}
async function planFeaturesMap(planIds: string[]) {
  const rows = planIds.length ? await platformPrisma.planFeature.findMany({ where: { planId: { in: planIds } } }) : [];
  const map = new Map<string, Record<string, boolean>>();
  for (const id of planIds) map.set(id, Object.fromEntries(SAAS_FEATURE_KEYS.map((key) => [key, true])));
  for (const row of rows) map.set(row.planId, { ...(map.get(row.planId) || {}), [row.featureKey]: row.enabled });
  return map;
}

export async function getSaasPlatformAction() {
  await requireSuper();
  await reconcileExpiredMemberships();

  const [tenants, plans, users, properties] = await Promise.all([
    platformPrisma.tenant.findMany({ include: { domains: true, featureOverrides: true }, orderBy: { createdAt: 'desc' } }),
    platformPrisma.plan.findMany({ include: { _count: { select: { subscriptions: true } } }, orderBy: [{ priceMonthly: 'asc' }, { name: 'asc' }] }),
    platformPrisma.user.count({ where: { isActive: true } }),
    platformPrisma.property.count({ where: { archivedAt: null, status: { not: 'ARCHIVADO' } } }),
  ]);
  const planFeatureMap = await planFeaturesMap(plans.map((plan) => plan.id));
  const baseDomain = process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar';

  const details = await Promise.all(tenants.map(async (tenant) => {
    const [entitlement, usage, features] = await Promise.all([
      getTenantEntitlements(tenant.id),
      getTenantUsage(tenant.id),
      getTenantFeatureFlags(tenant.id),
    ]);
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      cuit: tenant.cuit,
      address: tenant.address,
      phone: tenant.phone,
      createdAt: tenant.createdAt.toISOString(),
      domain: `${tenant.slug}.${baseDomain}`,
      domains: tenant.domains.map((domain) => ({ hostname: domain.hostname, isPrimary: domain.isPrimary, verified: Boolean(domain.verifiedAt) })),
      entitlement: serializeEntitlement(entitlement),
      usage,
      features,
      featureOverrides: Object.fromEntries(tenant.featureOverrides.map((item) => [item.featureKey, item.enabled])),
    };
  }));

  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const mrr = details.reduce((sum, tenant) => {
    const entitlement = tenant.entitlement;
    if (!entitlement || !['ACTIVE', 'PAST_DUE'].includes(entitlement.status)) return sum;
    return sum + Number(planById.get(entitlement.planId)?.priceMonthly || 0);
  }, 0);
  const now = Date.now();
  const soon = now + 15 * 24 * 60 * 60 * 1000;
  const expiringSoon = details.filter((tenant) => {
    const end = tenant.entitlement?.currentPeriodEnd;
    if (!end || tenant.status !== 'ACTIVE') return false;
    const time = new Date(end).getTime();
    return time >= now && time <= soon;
  }).length;

  return {
    metrics: {
      tenants: tenants.length,
      activeTenants: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,
      suspendedTenants: tenants.filter((tenant) => tenant.status === 'SUSPENDED').length,
      archivedTenants: tenants.filter((tenant) => tenant.status === 'ARCHIVED').length,
      trials: details.filter((tenant) => tenant.entitlement?.status === 'TRIAL').length,
      pastDue: details.filter((tenant) => tenant.entitlement?.status === 'PAST_DUE').length,
      expiringSoon,
      mrr,
      users,
      properties,
    },
    featureCatalog: SAAS_FEATURES,
    plans: plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      priceMonthly: Number(plan.priceMonthly),
      priceYearly: Number(plan.priceYearly),
      maxProperties: plan.maxProperties,
      maxGarages: plan.maxGarages,
      maxUsers: plan.maxUsers,
      maxPublications: plan.maxPublications,
      isActive: plan.isActive,
      subscriptions: plan._count.subscriptions,
      features: planFeatureMap.get(plan.id) || Object.fromEntries(SAAS_FEATURE_KEYS.map((key) => [key, true])),
    })),
    tenants: details,
  };
}

export async function getSaasTenantAction(tenantId: string) {
  await requireSuper();
  await reconcileTenantMembership(tenantId);
  const tenant = await platformPrisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      domains: true,
      featureOverrides: true,
      users: { orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } },
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 12, include: { plan: true } },
      saasPayments: { orderBy: { paymentDate: 'desc' }, take: 30 },
    },
  });
  if (!tenant) throw new Error('Tenant inexistente.');

  const [entitlement, usage, features] = await Promise.all([
    getTenantEntitlements(tenant.id),
    getTenantUsage(tenant.id),
    getTenantFeatureFlags(tenant.id),
  ]);
  const baseDomain = process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar';
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    cuit: tenant.cuit,
    address: tenant.address,
    phone: tenant.phone,
    createdAt: tenant.createdAt.toISOString(),
    domain: `${tenant.slug}.${baseDomain}`,
    domains: tenant.domains.map((domain) => ({ hostname: domain.hostname, isPrimary: domain.isPrimary, verifiedAt: domain.verifiedAt?.toISOString() || null })),
    entitlement: serializeEntitlement(entitlement),
    usage,
    features,
    featureOverrides: Object.fromEntries(tenant.featureOverrides.map((item) => [item.featureKey, item.enabled])),
    users: tenant.users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString(), lastLoginAt: user.lastLoginAt?.toISOString() || null })),
    subscriptions: tenant.subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status,
      planId: sub.planId,
      planCode: sub.plan.code,
      planName: sub.plan.name,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      trialEndsAt: sub.trialEndsAt?.toISOString() || null,
      createdAt: sub.createdAt.toISOString(),
    })),
    payments: tenant.saasPayments.map((payment) => ({ ...payment, amount: Number(payment.amount), paymentDate: payment.paymentDate.toISOString(), createdAt: payment.createdAt.toISOString() })),
  };
}

export async function updateSaasTenantAction(input: { tenantId: string; name: string; cuit?: string | null; address?: string | null; phone?: string | null }) {
  const session = await requireSuper();
  const name = input.name.trim();
  if (name.length < 2) throw new Error('El nombre del tenant es obligatorio.');
  const tenant = await platformPrisma.tenant.findUnique({ where: { id: input.tenantId }, select: { id: true } });
  if (!tenant) throw new Error('Tenant inexistente.');
  await platformPrisma.tenant.update({
    where: { id: input.tenantId },
    data: { name, cuit: input.cuit?.trim() || null, address: input.address?.trim() || null, phone: input.phone?.trim() || null },
  });
  await platformPrisma.auditLog.create({ data: { tenantId: input.tenantId, actorType: 'SUPERADMIN', action: 'TENANT_PROFILE_UPDATED', entityType: 'Tenant', entityId: input.tenantId, metadata: { superAdminId: session.superAdminId } } });
  clearTenantResolutionCache();
  revalidatePath('/superadmin');
  revalidatePath('/superadmin/tenants');
  revalidatePath(`/superadmin/tenants/${input.tenantId}`);
  return { success: true };
}

export async function updateTenantSubscriptionAction(input: {
  tenantId: string;
  planId: string;
  status: PlatformSubscriptionStatus;
  trialDays?: number;
  currentPeriodStart?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  trialEndsAt?: string | Date | null;
}) {
  const session = await requireSuper();
  const [tenant, plan, current] = await Promise.all([
    platformPrisma.tenant.findUnique({ where: { id: input.tenantId } }),
    platformPrisma.plan.findUnique({ where: { id: input.planId } }),
    platformPrisma.tenantSubscription.findFirst({ where: { tenantId: input.tenantId }, include: { plan: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  if (!tenant || !plan) throw new Error('Tenant o plan inexistente.');
  if (tenant.status === 'ARCHIVED') throw new Error('Un tenant archivado no puede modificar su membresía.');
  if (!plan.isActive && current?.planId !== plan.id) throw new Error('No se puede asignar un plan inactivo. Reactivalo primero.');

  const now = new Date();
  const start = toDate(input.currentPeriodStart, current?.currentPeriodStart || now)!;
  const end = toDate(input.currentPeriodEnd, current?.currentPeriodEnd || addMonths(start, 1))!;
  if (end.getTime() <= start.getTime()) throw new Error('El vencimiento debe ser posterior a la fecha de inicio.');
  let trialEnds: Date | null = null;
  if (input.status === 'TRIAL') {
    trialEnds = toDate(input.trialEndsAt, current?.trialEndsAt || addMonths(now, 1));
    if (!input.trialEndsAt && input.trialDays) trialEnds = new Date(now.getTime() + Math.max(1, Math.min(input.trialDays, 90)) * 86400000);
  }

  const subscription = current
    ? await platformPrisma.tenantSubscription.update({ where: { id: current.id }, data: { planId: plan.id, status: input.status, currentPeriodStart: start, currentPeriodEnd: end, trialEndsAt: trialEnds } })
    : await platformPrisma.tenantSubscription.create({ data: { tenantId: tenant.id, planId: plan.id, status: input.status, currentPeriodStart: start, currentPeriodEnd: end, trialEndsAt: trialEnds } });

  const tenantStatus = ['SUSPENDED', 'CANCELED'].includes(input.status) ? 'SUSPENDED' : 'ACTIVE';
  await platformPrisma.tenant.update({ where: { id: tenant.id }, data: { status: tenantStatus } });
  await platformPrisma.$executeRaw(Prisma.sql`INSERT INTO SubscriptionEvent (id,tenantId,subscriptionId,actorSuperAdminId,eventType,fromStatus,toStatus,fromPlanCode,toPlanCode,metadata,createdAt) VALUES (${randomUUID()},${tenant.id},${subscription.id},${session.superAdminId},'SUBSCRIPTION_CHANGED',${current?.status || null},${input.status},${current?.plan.code || null},${plan.code},${JSON.stringify({ currentPeriodStart: start.toISOString(), currentPeriodEnd: end.toISOString(), trialEndsAt: trialEnds?.toISOString() || null })},${now})`);
  await platformPrisma.auditLog.create({ data: { tenantId: tenant.id, actorType: 'SUPERADMIN', action: 'SUBSCRIPTION_CHANGED', entityType: 'TenantSubscription', entityId: subscription.id, metadata: { status: input.status, planCode: plan.code, currentPeriodStart: start.toISOString(), currentPeriodEnd: end.toISOString(), superAdminId: session.superAdminId } } });

  clearTenantResolutionCache();
  revalidatePath('/superadmin');
  revalidatePath('/superadmin/tenants');
  revalidatePath(`/superadmin/tenants/${tenant.id}`);
  return { success: true };
}

export async function setTenantFeatureOverrideAction(tenantId: string, featureKey: string, state: TenantFeatureState) {
  const session = await requireSuper();
  if (!isSaasFeatureKey(featureKey)) throw new Error('La función solicitada no pertenece al catálogo SaaS de OnlyMob.');
  const tenant = await platformPrisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) throw new Error('Tenant inexistente.');

  if (state === 'INHERIT') await platformPrisma.tenantFeatureOverride.deleteMany({ where: { tenantId, featureKey } });
  else {
    const enabled = state === 'ENABLED';
    await platformPrisma.tenantFeatureOverride.upsert({ where: { tenantId_featureKey: { tenantId, featureKey } }, update: { enabled }, create: { tenantId, featureKey, enabled } });
  }
  await platformPrisma.auditLog.create({ data: { tenantId, actorType: 'SUPERADMIN', action: 'FEATURE_OVERRIDE_CHANGED', entityType: 'TenantFeatureOverride', metadata: { featureKey, state, superAdminId: session.superAdminId } } });
  revalidatePath('/superadmin');
  revalidatePath(`/superadmin/tenants/${tenantId}`);
  return { success: true };
}

export async function setTenantFeatureAction(tenantId: string, featureKey: string, enabled: boolean) {
  return setTenantFeatureOverrideAction(tenantId, featureKey, enabled ? 'ENABLED' : 'DISABLED');
}

export async function savePlanAction(input: {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxProperties: number;
  maxGarages: number;
  maxUsers: number;
  maxPublications: number;
  isActive: boolean;
  features?: string[];
}) {
  await requireSuper();
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const name = input.name.trim();
  if (code.length < 2) throw new Error('El código del plan debe tener al menos 2 caracteres.');
  if (name.length < 2) throw new Error('El nombre del plan debe tener al menos 2 caracteres.');
  const priceMonthly = Number(input.priceMonthly);
  const priceYearly = Number(input.priceYearly);
  if (!Number.isFinite(priceMonthly) || priceMonthly < 0 || !Number.isFinite(priceYearly) || priceYearly < 0) throw new Error('Los precios del plan son inválidos.');
  const limits = {
    maxProperties: Math.trunc(Number(input.maxProperties)),
    maxGarages: Math.trunc(Number(input.maxGarages)),
    maxUsers: Math.trunc(Number(input.maxUsers)),
    maxPublications: Math.trunc(Number(input.maxPublications)),
  };
  if (limits.maxProperties < 0 || limits.maxGarages < 0 || limits.maxPublications < 0 || limits.maxUsers < 1) throw new Error('Los límites del plan son inválidos.');
  const selectedFeatures = new Set((input.features || SAAS_FEATURE_KEYS).filter((key): key is SaasFeatureKey => isSaasFeatureKey(key)));

  const planId = await platformPrisma.$transaction(async (tx) => {
    let planId: string;
    if (input.id) {
      const existing = await tx.plan.findUnique({ where: { id: input.id } });
      if (!existing) throw new Error('Plan inexistente.');
      await tx.plan.update({ where: { id: input.id }, data: { name, description: input.description?.trim() || null, priceMonthly, priceYearly, ...limits, isActive: Boolean(input.isActive) } });
      planId = existing.id;
    } else {
      const duplicate = await tx.plan.findUnique({ where: { code } });
      if (duplicate) throw new Error('Ya existe un plan con ese código.');
      const created = await tx.plan.create({ data: { code, name, description: input.description?.trim() || null, priceMonthly, priceYearly, ...limits, isActive: Boolean(input.isActive) } });
      planId = created.id;
    }
    for (const featureKey of SAAS_FEATURE_KEYS) {
      await tx.planFeature.upsert({
        where: { planId_featureKey: { planId, featureKey } },
        update: { enabled: selectedFeatures.has(featureKey) },
        create: { planId, featureKey, enabled: selectedFeatures.has(featureKey) },
      });
    }
    return planId;
  });

  revalidatePath('/superadmin');
  revalidatePath('/superadmin/planes');
  revalidatePath('/superadmin/tenants');
  return { success: true, planId };
}

export async function recordSaasPaymentAction(input: { tenantId: string; amount: number; months?: number; method?: string | null; reference?: string | null; notes?: string | null }) {
  const session = await requireSuper();
  const amount = Number(input.amount);
  const months = Math.max(1, Math.min(Math.trunc(Number(input.months || 1)), 24));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('El importe debe ser mayor a cero.');
  const [tenant, current] = await Promise.all([
    platformPrisma.tenant.findUnique({ where: { id: input.tenantId } }),
    platformPrisma.tenantSubscription.findFirst({ where: { tenantId: input.tenantId }, orderBy: { createdAt: 'desc' }, include: { plan: true } }),
  ]);
  if (!tenant || tenant.status === 'ARCHIVED') throw new Error('Tenant no disponible.');
  if (!current) throw new Error('El tenant no tiene una suscripción para renovar.');
  const now = new Date();
  const base = current.currentPeriodEnd.getTime() > now.getTime() ? current.currentPeriodEnd : now;
  const newEnd = addMonths(base, months);
  const notes = [input.method?.trim() ? `Medio: ${input.method.trim()}` : '', input.notes?.trim() || ''].filter(Boolean).join(' · ') || null;

  const payment = await platformPrisma.$transaction(async (tx) => {
    const created = await tx.saasPayment.create({ data: { tenantId: tenant.id, amount, currency: 'ARS', status: 'PAID', paymentDate: now, reference: input.reference?.trim() || null, notes } });
    await tx.tenantSubscription.update({ where: { id: current.id }, data: { status: 'ACTIVE', currentPeriodEnd: newEnd, trialEndsAt: null } });
    await tx.tenant.update({ where: { id: tenant.id }, data: { status: 'ACTIVE', archivedAt: null } });
    await tx.auditLog.create({ data: { tenantId: tenant.id, actorType: 'SUPERADMIN', action: 'SAAS_PAYMENT_REGISTERED', entityType: 'SaasPayment', entityId: created.id, metadata: { amount, months, newPeriodEnd: newEnd.toISOString(), planCode: current.plan.code, superAdminId: session.superAdminId } } });
    return created;
  });

  clearTenantResolutionCache();
  revalidatePath('/superadmin');
  revalidatePath('/superadmin/tenants');
  revalidatePath(`/superadmin/tenants/${tenant.id}`);
  return { success: true, paymentId: payment.id, currentPeriodEnd: newEnd.toISOString() };
}

export async function startTenantImpersonationAction(tenantId: string) {
  const session = await requireSuper();
  const [tenant, entitlement] = await Promise.all([
    platformPrisma.tenant.findUnique({ where: { id: tenantId }, include: { domains: true } }),
    getTenantEntitlements(tenantId),
  ]);
  if (!tenant || tenant.status !== 'ACTIVE') throw new Error('Tenant no disponible.');
  if (entitlement && !subscriptionStatusAllowsAccess(entitlement.status, entitlement.trialEndsAt, entitlement.currentPeriodEnd)) throw new Error('La membresía del tenant no permite acceso. Reactivala antes de ingresar como soporte.');

  const user = await platformPrisma.user.findFirst({ where: { tenantId, isActive: true, role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
  if (!user) throw new Error('No hay administrador activo.');
  const token = `omi_${randomBytes(32).toString('base64url')}`;
  const tokenHash = hash(token);
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await platformPrisma.$executeRaw(Prisma.sql`INSERT INTO ImpersonationGrant (id,tenantId,userId,superAdminId,tokenHash,expiresAt,createdAt) VALUES (${id},${tenantId},${user.id},${session.superAdminId},${tokenHash},${expiresAt},${new Date()})`);
  await platformPrisma.auditLog.create({ data: { tenantId, actorType: 'SUPERADMIN', action: 'IMPERSONATION_GRANTED', entityType: 'User', entityId: user.id, metadata: { grantId: id, superAdminId: session.superAdminId, expiresAt: expiresAt.toISOString() } } });
  const baseDomain = process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar';
  return { success: true, url: `https://${tenant.slug}.${baseDomain}/api/internal/impersonation/consume?token=${encodeURIComponent(token)}` };
}
