import 'server-only';

import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';

export { platformPrisma } from '@/lib/prisma-core';

const READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_WHERE_OPERATIONS = new Set([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

const tenantClientCache = new Map<string, any>();

function tenantOperation(tenantId: string) {
  return async ({ operation, args, query }: any) => {
    args ||= {};

    if (READ_OPERATIONS.has(operation) || WRITE_WHERE_OPERATIONS.has(operation)) {
      args.where = { ...args.where, tenantId };
    } else if (operation === 'create') {
      args.data = { ...args.data, tenantId };
    } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
      const rows = Array.isArray(args.data) ? args.data : [args.data];
      args.data = rows.map((row: any) => ({ ...row, tenantId }));
    } else if (operation === 'upsert') {
      args.where = { ...args.where, tenantId };
      args.create = { ...args.create, tenantId };
    }

    return query(args);
  };
}

export async function getTenantPrisma() {
  const tenant = await resolveTenantContext();
  const cached = tenantClientCache.get(tenant.id);
  if (cached) return cached;

  const scoped = tenantOperation(tenant.id);
  const client = platformPrisma.$extends({
    query: {
      user: { $allOperations: scoped },
      propertyRenter: { $allOperations: scoped },
      contact: { $allOperations: scoped },
      property: { $allOperations: scoped },
      propertyOwner: { $allOperations: scoped },
      garage: { $allOperations: scoped },
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
      publication: { $allOperations: scoped },
      reservation: { $allOperations: scoped },
      deal: { $allOperations: scoped },
      propertyExpense: { $allOperations: scoped },
      ownerSettlement: { $allOperations: scoped },
      recurringCharge: { $allOperations: scoped },
    },
  });

  tenantClientCache.set(tenant.id, client);
  return client;
}
