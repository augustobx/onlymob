import 'server-only';

import { platformPrisma } from '@/lib/prisma-core';
import { subscriptionStatusAllowsAccess } from '@/lib/saas-policy';

export type MembershipAccess = {
  allowed: boolean;
  reason: 'OK' | 'TENANT_SUSPENDED' | 'MEMBERSHIP_EXPIRED' | 'MEMBERSHIP_SUSPENDED' | 'TENANT_ARCHIVED' | 'TENANT_NOT_FOUND';
  tenantStatus: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
};

export async function getTenantMembershipAccess(tenantId: string, now = new Date()): Promise<MembershipAccess> {
  const [tenant, subscription] = await Promise.all([
    platformPrisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, status: true } }),
    platformPrisma.tenantSubscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, currentPeriodStart: true, currentPeriodEnd: true, trialEndsAt: true },
    }),
  ]);

  if (!tenant) return { allowed: false, reason: 'TENANT_NOT_FOUND', tenantStatus: null, subscriptionId: null, subscriptionStatus: null, currentPeriodStart: null, currentPeriodEnd: null, trialEndsAt: null };
  if (tenant.status === 'ARCHIVED') return { allowed: false, reason: 'TENANT_ARCHIVED', tenantStatus: tenant.status, subscriptionId: subscription?.id || null, subscriptionStatus: subscription?.status || null, currentPeriodStart: subscription?.currentPeriodStart || null, currentPeriodEnd: subscription?.currentPeriodEnd || null, trialEndsAt: subscription?.trialEndsAt || null };
  if (tenant.status === 'SUSPENDED') return { allowed: false, reason: 'TENANT_SUSPENDED', tenantStatus: tenant.status, subscriptionId: subscription?.id || null, subscriptionStatus: subscription?.status || null, currentPeriodStart: subscription?.currentPeriodStart || null, currentPeriodEnd: subscription?.currentPeriodEnd || null, trialEndsAt: subscription?.trialEndsAt || null };

  // Compatibilidad controlada con tenants legacy todavía sin suscripción.
  if (!subscription) return { allowed: true, reason: 'OK', tenantStatus: tenant.status, subscriptionId: null, subscriptionStatus: null, currentPeriodStart: null, currentPeriodEnd: null, trialEndsAt: null };

  const allowed = subscriptionStatusAllowsAccess(subscription.status, subscription.trialEndsAt, subscription.currentPeriodEnd, now);
  const explicitBlock = subscription.status === 'SUSPENDED' || subscription.status === 'CANCELED';
  return {
    allowed,
    reason: allowed ? 'OK' : explicitBlock ? 'MEMBERSHIP_SUSPENDED' : 'MEMBERSHIP_EXPIRED',
    tenantStatus: tenant.status,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEndsAt: subscription.trialEndsAt,
  };
}

export async function reconcileTenantMembership(tenantId: string, now = new Date()): Promise<MembershipAccess> {
  const state = await getTenantMembershipAccess(tenantId, now);
  if (state.allowed || !state.subscriptionId) return state;
  if (state.reason === 'TENANT_ARCHIVED' || state.reason === 'TENANT_NOT_FOUND' || state.reason === 'TENANT_SUSPENDED') return state;

  const shouldSuspendSubscription = state.subscriptionStatus !== 'SUSPENDED' && state.subscriptionStatus !== 'CANCELED';
  await platformPrisma.$transaction(async (tx) => {
    if (shouldSuspendSubscription) {
      await tx.tenantSubscription.updateMany({
        where: { id: state.subscriptionId!, tenantId, status: state.subscriptionStatus as any },
        data: { status: 'SUSPENDED' },
      });
    }
    await tx.tenant.updateMany({ where: { id: tenantId, status: 'ACTIVE' }, data: { status: 'SUSPENDED' } });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: 'SYSTEM',
        action: state.reason === 'MEMBERSHIP_EXPIRED' ? 'MEMBERSHIP_AUTO_SUSPENDED' : 'MEMBERSHIP_SUSPENDED_SYNC',
        entityType: 'TenantSubscription',
        entityId: state.subscriptionId,
        metadata: {
          previousStatus: state.subscriptionStatus,
          currentPeriodEnd: state.currentPeriodEnd?.toISOString() || null,
          trialEndsAt: state.trialEndsAt?.toISOString() || null,
        },
      },
    });
  });

  return {
    ...state,
    allowed: false,
    reason: state.reason === 'MEMBERSHIP_EXPIRED' ? 'MEMBERSHIP_EXPIRED' : 'MEMBERSHIP_SUSPENDED',
    tenantStatus: 'SUSPENDED',
    subscriptionStatus: shouldSuspendSubscription ? 'SUSPENDED' : state.subscriptionStatus,
  };
}

export async function reconcileExpiredMemberships(input: { tenantId?: string | null } = {}) {
  const tenants = await platformPrisma.tenant.findMany({
    where: { status: 'ACTIVE', ...(input.tenantId ? { id: input.tenantId } : {}) },
    select: { id: true },
  });
  let suspended = 0;
  for (const tenant of tenants) {
    const before = await getTenantMembershipAccess(tenant.id);
    if (!before.allowed && before.reason !== 'TENANT_SUSPENDED') {
      await reconcileTenantMembership(tenant.id);
      suspended += 1;
    }
  }
  return { checked: tenants.length, suspended };
}
