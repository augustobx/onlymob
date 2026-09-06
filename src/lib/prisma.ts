import 'server-only';

import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';
import { applyTenantScope } from '@/lib/tenant-scope';
import { assertTenantPlanLimit, type PlanResource } from '@/lib/saas';

export { platformPrisma } from '@/lib/prisma-core';

function tenantOperation(tenantId: string, limitedResource?: PlanResource) {
  return async ({ operation, args, query }: any) => {
    if (limitedResource && ['create','createMany','createManyAndReturn','upsert'].includes(operation)) {
      await assertTenantPlanLimit(tenantId, limitedResource);
    }
    return query(applyTenantScope(tenantId, operation, args || {}));
  };
}

export async function getTenantPrisma() {
  const tenant = await resolveTenantContext();
  const scoped = tenantOperation(tenant.id);

  return platformPrisma.$extends({
    query: {
      user: { $allOperations: tenantOperation(tenant.id, 'users') },
      propertyRenter: { $allOperations: scoped },
      contact: { $allOperations: scoped },
      property: { $allOperations: tenantOperation(tenant.id, 'properties') },
      propertyOwner: { $allOperations: scoped },
      garage: { $allOperations: tenantOperation(tenant.id, 'garages') },
      propertyLease: { $allOperations: scoped },
      garageLease: { $allOperations: scoped },
      debt: { $allOperations: scoped },
      payment: { $allOperations: scoped },
      document: { $allOperations: scoped },
      tenantSetting: { $allOperations: scoped },
      roleProfile: { $allOperations: scoped },
      auditLog: { $allOperations: scoped },
      tenantCounter: { $allOperations: scoped },
      lead: { $allOperations: scoped },
      leadInteraction: { $allOperations: scoped },
      demand: { $allOperations: scoped },
      leadPropertyInterest: { $allOperations: scoped },
      task: { $allOperations: scoped },
      calendarEvent: { $allOperations: scoped },
      publication: { $allOperations: tenantOperation(tenant.id, 'publications') },
      reservation: { $allOperations: scoped },
      deal: { $allOperations: scoped },
      propertyExpense: { $allOperations: scoped },
      ownerSettlement: { $allOperations: scoped },
      recurringCharge: { $allOperations: scoped },
      providerProfile: { $allOperations: scoped },
      maintenanceRequest: { $allOperations: scoped },
      maintenanceEvent: { $allOperations: scoped },
      inspection: { $allOperations: scoped },
      inspectionFinding: { $allOperations: scoped },
    },
  });
}
