import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { getAdminSession } from '@/lib/auth';
import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';
import { publishDomainActivity } from '@/lib/domain-events';

export const getTenantUserContext = cache(async () => {
  const tenant = await resolveTenantContext();
  const session = await getAdminSession(tenant.id);
  if (!session) return null;
  return { tenant, session };
});

// Alias de compatibilidad para lecturas existentes. No implica privilegio ADMIN.
export const getTenantAdminContext = getTenantUserContext;

export async function requireTenantUser() {
  const context = await getTenantUserContext();
  if (!context) throw new Error('UNAUTHORIZED');
  return context;
}

// Fail-closed: los actions legacy que todavía llamen a requireTenantAdmin
// quedan reservados a ADMIN y nunca saltan el RBAC de un STAFF.
export async function requireTenantAdmin() {
  const context = await requireTenantUser();
  if (context.session.role !== 'ADMIN') throw new Error('FORBIDDEN');
  return context;
}

export async function auditTenantAction(input: {
  tenantId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim();

  await platformPrisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId || null,
      actorType: input.actorUserId ? 'USER' : 'SYSTEM',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      metadata: input.metadata as any,
      ipAddress: forwardedFor || headerStore.get('x-real-ip') || null,
      userAgent: headerStore.get('user-agent')?.slice(0, 500) || null,
    },
  });

  try {
    await publishDomainActivity(input);
  } catch (error) {
    console.error('[OnlyMob activity-event]', error);
  }
}

export async function assertPropertyBelongsToTenant(tenantId: string, propertyId: string) {
  const property = await platformPrisma.property.findFirst({
    where: { id: propertyId, tenantId, status: { not: 'ARCHIVADO' } },
  });
  if (!property) throw new Error('Propiedad no encontrada para esta inmobiliaria.');
  return property;
}

export async function assertRenterBelongsToTenant(tenantId: string, renterId: string) {
  const renter = await platformPrisma.propertyRenter.findFirst({ where: { id: renterId, tenantId } });
  if (!renter) throw new Error('Inquilino no encontrado para esta inmobiliaria.');
  return renter;
}

export async function assertGarageSpacesBelongToTenant(tenantId: string, spaceIds: string[]) {
  const uniqueIds = [...new Set(spaceIds)];
  if (uniqueIds.length === 0) throw new Error('Seleccioná al menos una plaza.');

  const spaces = await platformPrisma.garageSpace.findMany({
    where: { id: { in: uniqueIds }, garage: { tenantId } },
    include: { garage: true },
  });

  if (spaces.length !== uniqueIds.length) throw new Error('Una o más plazas no pertenecen a esta inmobiliaria.');
  return spaces;
}

export async function assertContactBelongsToTenant(tenantId: string, contactId: string) {
  const contact = await platformPrisma.contact.findFirst({
    where: { id: contactId, tenantId, archivedAt: null },
  });
  if (!contact) throw new Error('Contacto no encontrado para esta inmobiliaria.');
  return contact;
}
