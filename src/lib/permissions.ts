import 'server-only';

import { platformPrisma } from '@/lib/prisma-core';
import { requireTenantUser } from '@/lib/tenant-guard';

export async function requirePermission(module: string, action: string) {
  const context = await requireTenantUser();
  const user = await platformPrisma.user.findFirst({
    where: { id: context.session.userId, tenantId: context.tenant.id, isActive: true },
    include: { roleProfile: { include: { permissions: true } } },
  });

  if (!user) throw new Error('UNAUTHORIZED');
  if (user.role === 'ADMIN') return { ...context, user };

  const allowed = user.roleProfile?.permissions.some(
    (permission) => permission.module === module && (permission.action === action || permission.action === 'manage'),
  );

  if (!allowed) throw new Error('FORBIDDEN');
  return { ...context, user };
}
