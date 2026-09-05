import 'server-only';

import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';

export type PlanResource = 'properties' | 'users' | 'publications';

type EntitlementRow = { subscriptionId:string; status:string; planId:string; planCode:string; planName:string; maxProperties:number; maxUsers:number; maxPublications:number; trialEndsAt:Date|null; currentPeriodEnd:Date };

export async function getTenantEntitlements(tenantId: string) {
  const rows = await platformPrisma.$queryRaw<EntitlementRow[]>(Prisma.sql`
    SELECT ts.id AS subscriptionId,ts.status,p.id AS planId,p.code AS planCode,p.name AS planName,p.maxProperties,p.maxUsers,p.maxPublications,ts.trialEndsAt,ts.currentPeriodEnd
    FROM TenantSubscription ts JOIN Plan p ON p.id=ts.planId
    WHERE ts.tenantId=${tenantId} ORDER BY ts.createdAt DESC LIMIT 1
  `);
  return rows[0] || null;
}

export async function getTenantUsage(tenantId: string) {
  const [properties, users, publications] = await Promise.all([
    platformPrisma.property.count({ where: { tenantId, archivedAt: null, status: { not: 'ARCHIVADO' } } }),
    platformPrisma.user.count({ where: { tenantId, isActive: true } }),
    platformPrisma.publication.count({ where: { tenantId, status: { not: 'ENDED' } } }),
  ]);
  return { properties, users, publications };
}

export async function assertTenantPlanLimit(tenantId: string, resource: PlanResource) {
  const entitlement = await getTenantEntitlements(tenantId);
  if (!entitlement) return;
  if (['SUSPENDED','CANCELED'].includes(entitlement.status)) throw new Error('La suscripción del tenant no está activa.');
  const usage = await getTenantUsage(tenantId);
  const limit = resource === 'properties' ? entitlement.maxProperties : resource === 'users' ? entitlement.maxUsers : entitlement.maxPublications;
  if (usage[resource] >= limit) throw new Error(`Límite del plan alcanzado para ${resource}: ${usage[resource]}/${limit}.`);
}

export async function isTenantFeatureEnabled(tenantId: string, featureKey: string, defaultValue = true) {
  const override = await platformPrisma.tenantFeatureOverride.findUnique({ where: { tenantId_featureKey: { tenantId, featureKey } } });
  return override ? override.enabled : defaultValue;
}
