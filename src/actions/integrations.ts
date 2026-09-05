'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction } from '@/lib/tenant-guard';
import { requirePermission } from '@/lib/permissions';
import { API_SCOPES, WEBHOOK_EVENTS, createApiCredential, emitWebhookEvent } from '@/lib/integrations';

const KeySchema = z.object({ name: z.string().min(2).max(120), scopes: z.array(z.string()).min(1) });
const WebhookSchema = z.object({ name: z.string().min(2).max(120), url: z.string().url().max(500), events: z.array(z.string()).min(1) });

export async function getIntegrationsDataAction() {
  const { tenant } = await requirePermission('integrations', 'read');
  const [credentials, endpoints, deliveries] = await Promise.all([
    platformPrisma.$queryRaw<Array<{ id:string; name:string; tokenPrefix:string; scopes:string; isActive:number|boolean; lastUsedAt:Date|null; createdAt:Date }>>(Prisma.sql`SELECT id,name,tokenPrefix,scopes,isActive,lastUsedAt,createdAt FROM ApiCredential WHERE tenantId=${tenant.id} ORDER BY createdAt DESC`),
    platformPrisma.$queryRaw<Array<{ id:string; name:string; url:string; events:string; isActive:number|boolean; createdAt:Date }>>(Prisma.sql`SELECT id,name,url,events,isActive,createdAt FROM WebhookEndpoint WHERE tenantId=${tenant.id} ORDER BY createdAt DESC`),
    platformPrisma.$queryRaw<Array<{ id:string; eventKey:string; status:string; httpStatus:number|null; attempts:number; lastError:string|null; createdAt:Date; endpointName:string }>>(Prisma.sql`SELECT d.id,d.eventKey,d.status,d.httpStatus,d.attempts,d.lastError,d.createdAt,e.name AS endpointName FROM WebhookDelivery d JOIN WebhookEndpoint e ON e.id=d.endpointId WHERE d.tenantId=${tenant.id} ORDER BY d.createdAt DESC LIMIT 50`),
  ]);
  return {
    scopes: [...API_SCOPES], events: [...WEBHOOK_EVENTS],
    credentials: credentials.map((x) => ({ ...x, isActive: Boolean(x.isActive), scopes: safeArray(x.scopes) })),
    endpoints: endpoints.map((x) => ({ ...x, isActive: Boolean(x.isActive), events: safeArray(x.events) })),
    deliveries,
  };
}

function safeArray(value: string) { try { const parsed=JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; } }

export async function createApiCredentialAction(input: z.input<typeof KeySchema>) {
  const { tenant, session } = await requirePermission('integrations', 'manage');
  const data = KeySchema.parse(input);
  const invalid = data.scopes.filter((scope) => !API_SCOPES.includes(scope as any));
  if (invalid.length) throw new Error('Scope inválido.');
  const result = await createApiCredential(tenant.id, data.name.trim(), data.scopes);
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'API_CREDENTIAL_CREATED', entityType: 'ApiCredential', entityId: result.id, metadata: { name: data.name, scopes: data.scopes } });
  revalidatePath('/integraciones');
  return { success: true, token: result.token };
}

export async function revokeApiCredentialAction(id: string) {
  const { tenant, session } = await requirePermission('integrations', 'manage');
  const changed = await platformPrisma.$executeRaw(Prisma.sql`UPDATE ApiCredential SET isActive=false WHERE id=${id} AND tenantId=${tenant.id}`);
  if (!changed) throw new Error('Credencial no encontrada.');
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'API_CREDENTIAL_REVOKED', entityType: 'ApiCredential', entityId: id });
  revalidatePath('/integraciones'); return { success: true };
}

export async function createWebhookAction(input: z.input<typeof WebhookSchema>) {
  const { tenant, session } = await requirePermission('integrations', 'manage');
  const data = WebhookSchema.parse(input);
  if (data.events.some((event) => !WEBHOOK_EVENTS.includes(event as any))) throw new Error('Evento inválido.');
  const id = randomUUID();
  await platformPrisma.$executeRaw(Prisma.sql`INSERT INTO WebhookEndpoint (id,tenantId,name,url,events,isActive,createdAt,updatedAt) VALUES (${id},${tenant.id},${data.name.trim()},${data.url.trim()},${JSON.stringify(data.events)},true,${new Date()},${new Date()})`);
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'WEBHOOK_CREATED', entityType: 'WebhookEndpoint', entityId: id, metadata: { events: data.events } });
  revalidatePath('/integraciones'); return { success: true, id };
}

export async function toggleWebhookAction(id: string, active: boolean) {
  const { tenant } = await requirePermission('integrations', 'manage');
  const changed = await platformPrisma.$executeRaw(Prisma.sql`UPDATE WebhookEndpoint SET isActive=${active},updatedAt=${new Date()} WHERE id=${id} AND tenantId=${tenant.id}`);
  if (!changed) throw new Error('Webhook no encontrado.');
  revalidatePath('/integraciones'); return { success: true };
}

export async function testWebhookAction() {
  const { tenant } = await requirePermission('integrations', 'manage');
  return emitWebhookEvent(tenant.id, 'property.updated', { test: true, tenantId: tenant.id });
}
