export const TENANT_READ_OPERATIONS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy',
]);

export const TENANT_WRITE_WHERE_OPERATIONS = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

export function applyTenantScope(tenantId: string, operation: string, args: any = {}) {
  const next = { ...args };
  if (TENANT_READ_OPERATIONS.has(operation) || TENANT_WRITE_WHERE_OPERATIONS.has(operation)) {
    next.where = { ...(args?.where || {}), tenantId };
  } else if (operation === 'create') {
    next.data = { ...(args?.data || {}), tenantId };
  } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
    const rows = Array.isArray(args?.data) ? args.data : [args?.data || {}];
    next.data = rows.map((row: any) => ({ ...row, tenantId }));
  } else if (operation === 'upsert') {
    next.where = { ...(args?.where || {}), tenantId };
    next.create = { ...(args?.create || {}), tenantId };
  }
  return next;
}
