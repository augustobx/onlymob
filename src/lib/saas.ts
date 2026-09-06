import 'server-only';

import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { SAAS_FEATURE_KEYS, type SaasFeatureKey } from '@/lib/feature-catalog';

export type PlanResource = 'properties' | 'garages' | 'users' | 'publications';

type EntitlementRow = {
  subscriptionId: string;
  status: string;
  planId: string;
  planCode: string;
  planName: string;
  maxProperties: number;
  maxGarages: number;
  maxUsers: number;
  maxPublications: number;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date;
};

export async function getTenantEntitlements(tenantId: string) {
  const rows = await platformPrisma.$queryRaw<EntitlementRow[]>(Prisma.sql`
    SELECT
      ts.id AS subscriptionId,
      ts.status,
      p.id AS planId,
      p.code AS planCode,
      p.name AS planName,
      p.maxProperties,
      p.maxGarages,
      p.maxUsers,
      p.maxPublications,
      ts.trialEndsAt,
      ts.currentPeriodEnd
    FROM TenantSubscription ts
    JOIN Plan p ON p.id = ts.planId
    WHERE ts.tenantId = ${tenantId}
    ORDER BY ts.createdAt DESC
    LIMIT 1
  `);
  return rows[0] || null;
}

export async function getTenantUsage(tenantId: string) {
  const [properties, garages, users, publications] = await Promise.all([
    platformPrisma.property.count({ where: { tenantId, archivedAt: null, status: { not: 'ARCHIVADO' } } }),
    platformPrisma.garage.count({ where: { tenantId } }),
    platformPrisma.user.count({ where: { tenantId, isActive: true } }),
    platformPrisma.publication.count({ where: { tenantId, status: { not: 'ENDED' } } }),
  ]);
  return { properties, garages, users, publications };
}

export async function assertTenantPlanLimit(tenantId: string, resource: PlanResource) {
  const entitlement = await getTenantEntitlements(tenantId);
  // Compatibilidad con tenants legacy sin suscripción registrada.
  if (!entitlement) return;
  if (['SUSPENDED', 'CANCELED'].includes(entitlement.status)) {
    throw new Error('La suscripción del tenant no está activa.');
  }
  if (entitlement.status === 'TRIAL' && entitlement.trialEndsAt && entitlement.trialEndsAt.getTime() < Date.now()) {
    throw new Error('El período de prueba del tenant venció.');
  }

  const usage = await getTenantUsage(tenantId);
  const limits: Record<PlanResource, number> = {
    properties: entitlement.maxProperties,
    garages: entitlement.maxGarages,
    users: entitlement.maxUsers,
    publications: entitlement.maxPublications,
  };
  const limit = limits[resource];
  if (usage[resource] >= limit) {
    throw new Error(`Límite del plan alcanzado para ${resource}: ${usage[resource]}/${limit}.`);
  }
}

export async function isTenantFeatureEnabled(tenantId: string, featureKey: string, defaultValue = true) {
  const override = await platformPrisma.tenantFeatureOverride.findUnique({
    where: { tenantId_featureKey: { tenantId, featureKey } },
  });
  return override ? override.enabled : defaultValue;
}

export async function getTenantFeatureFlags(
  tenantId: string,
  keys: readonly SaasFeatureKey[] = SAAS_FEATURE_KEYS,
): Promise<Record<SaasFeatureKey, boolean>> {
  const overrides = await platformPrisma.tenantFeatureOverride.findMany({
    where: { tenantId, featureKey: { in: [...keys] } },
    select: { featureKey: true, enabled: true },
  });
  const overrideMap = new Map(overrides.map((item) => [item.featureKey, item.enabled]));
  return Object.fromEntries(keys.map((key) => [key, overrideMap.get(key) ?? true])) as Record<SaasFeatureKey, boolean>;
}
