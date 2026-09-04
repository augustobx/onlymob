import 'server-only';

import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';

export { platformPrisma } from '@/lib/prisma-core';

export async function getTenantPrisma() {
  const tenant = await resolveTenantContext();
  const tenantId = tenant.id;

  return platformPrisma.$extends({
    query: {
      user: {
        async $allOperations({ operation, args, query }: any) {
          if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args?.data, tenantId };
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          }
          return query(args);
        },
      },
      propertyRenter: {
        async $allOperations({ operation, args, query }: any) {
          if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args?.data, tenantId };
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          }
          return query(args);
        },
      },
      property: {
        async $allOperations({ operation, args, query }: any) {
          if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args?.data, tenantId };
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          }
          return query(args);
        },
      },
      garage: {
        async $allOperations({ operation, args, query }: any) {
          if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args?.data, tenantId };
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          }
          return query(args);
        },
      },
      propertyLease: {
        async $allOperations({ operation, args, query }: any) {
          if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args?.data, tenantId };
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          }
          return query(args);
        },
      },
      garageLease: {
        async $allOperations({ operation, args, query }: any) {
          if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args?.data, tenantId };
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          }
          return query(args);
        },
      },
      debt: {
        async $allOperations({ operation, args, query }: any) {
          if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args?.data, tenantId };
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          }
          return query(args);
        },
      },
      payment: {
        async $allOperations({ operation, args, query }: any) {
          if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args?.data, tenantId };
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          }
          return query(args);
        },
      },
      tenantSetting: {
        async $allOperations({ operation, args, query }: any) {
          if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          } else if (operation === 'create') {
            args.data = { ...args?.data, tenantId };
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args?.where, tenantId };
          }
          return query(args);
        },
      },
    },
  });
}
