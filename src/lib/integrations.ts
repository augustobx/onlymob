import 'server-only';

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';

export const API_SCOPES = ['read:properties','read:leads','write:leads','export:properties','import:leads'] as const;
export const WEBHOOK_EVENTS = [
  'lead.created',
  'lead.updated',
  'property.created',
  'property.updated',
  'visit.created',
  'reservation.created',
  'reservation.updated',
  'deal.created',
  'deal.updated',
  'deal.won',
  'lease.created',
  'lease.updated',
  'debt.created',
  'payment.registered',
  'maintenance.created',
  'maintenance.updated',
  'document.created',
  'document.updated',
  'settlement.ready',
  'settlement.updated',
  'communication.sent',
  'financial.movement.created',
] as const;

function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
function json(value: unknown) { return JSON.stringify(value); }

export async function createApiCredential(tenantId: string, name: string, scopes: string[]) {
  const raw = `om_live_${randomBytes(28).toString('base64url')}`;
  const id = randomUUID();
  const tokenHash = sha256(raw);
  const tokenPrefix = raw.slice(0, 16);
  await platformPrisma.$executeRaw(Prisma.sql`
    INSERT INTO ApiCredential (id, tenantId, name, tokenPrefix, tokenHash, scopes, isActive, createdAt)
    VALUES (${id}, ${tenantId}, ${name}, ${tokenPrefix}, ${tokenHash}, ${json(scopes)}, true, ${new Date()})
  `);
  return { id, token: raw, tokenPrefix };
}

export async function authenticateApiRequest(request: Request, requiredScope: string) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token.length < 24) return null;
  const hash = sha256(token);
  const rows = await platformPrisma.$queryRaw<Array<{ id: string; tenantId: string; tokenHash: string; scopes: string; isActive: number|boolean; expiresAt: Date|null }>>(Prisma.sql`
    SELECT id, tenantId, tokenHash, scopes, isActive, expiresAt FROM ApiCredential WHERE tokenHash = ${hash} LIMIT 1
  `);
  const row = rows[0];
  if (!row || !Boolean(row.isActive) || (row.expiresAt && row.expiresAt <= new Date())) return null;
  const expected = Buffer.from(row.tokenHash, 'utf8');
  const received = Buffer.from(hash, 'utf8');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  let scopes: string[] = [];
  try { scopes = JSON.parse(row.scopes); } catch { return null; }
  if (!scopes.includes(requiredScope)) return null;
  await platformPrisma.$executeRaw(Prisma.sql`UPDATE ApiCredential SET lastUsedAt = ${new Date()} WHERE id = ${row.id}`);
  return { credentialId: row.id, tenantId: row.tenantId, scopes };
}

function webhookSecret() {
  const secret = process.env.INTEGRATION_WEBHOOK_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') return null;
  return secret || 'onlymob-dev-webhook-secret-not-production';
}

export async function queueWebhookEvent(tenantId: string, eventKey: string, payload: unknown) {
  const rows = await platformPrisma.$queryRaw<Array<{ id: string; events: string }>>(Prisma.sql`
    SELECT id, events FROM WebhookEndpoint WHERE tenantId = ${tenantId} AND isActive = true
  `);
  const matching = rows.filter((row) => {
    try { return (JSON.parse(row.events) as string[]).includes(eventKey); } catch { return false; }
  });
  if (!matching.length) return { queued: 0 };

  const body = json({ id: randomUUID(), event: eventKey, occurredAt: new Date().toISOString(), data: payload });
  for (const endpoint of matching) {
    await platformPrisma.$executeRaw(Prisma.sql`
      INSERT INTO WebhookDelivery (id, tenantId, endpointId, eventKey, payload, status, attempts, nextAttemptAt, createdAt)
      VALUES (${randomUUID()}, ${tenantId}, ${endpoint.id}, ${eventKey}, ${body}, 'PENDING', 0, ${new Date()}, ${new Date()})
    `);
  }
  return { queued: matching.length };
}

export async function dispatchPendingWebhooks(input: { tenantId?: string | null; limit?: number } = {}) {
  const limit = Math.max(1, Math.min(input.limit || 50, 200));
  const secret = webhookSecret();
  const tenantFilter = input.tenantId ? Prisma.sql`AND d.tenantId = ${input.tenantId}` : Prisma.sql``;
  const rows = await platformPrisma.$queryRaw<Array<{
    id: string;
    tenantId: string;
    endpointId: string;
    eventKey: string;
    payload: string;
    attempts: number;
    url: string;
  }>>(Prisma.sql`
    SELECT d.id, d.tenantId, d.endpointId, d.eventKey, d.payload, d.attempts, e.url
    FROM WebhookDelivery d
    JOIN WebhookEndpoint e ON e.id = d.endpointId AND e.tenantId = d.tenantId
    WHERE e.isActive = true
      AND d.status IN ('PENDING','FAILED')
      AND d.attempts < 5
      AND (d.nextAttemptAt IS NULL OR d.nextAttemptAt <= NOW(3))
      ${tenantFilter}
    ORDER BY d.createdAt ASC
    LIMIT ${limit}
  `);

  let delivered = 0;
  let failed = 0;
  for (const row of rows) {
    const attempt = row.attempts + 1;
    if (!secret) {
      failed += 1;
      await platformPrisma.$executeRaw(Prisma.sql`
        UPDATE WebhookDelivery SET status='FAILED', attempts=${attempt}, lastError='INTEGRATION_WEBHOOK_SECRET no configurado', nextAttemptAt=${new Date(Date.now() + 15 * 60_000)} WHERE id=${row.id}
      `);
      continue;
    }

    try {
      const signature = createHmac('sha256', secret).update(row.payload).digest('hex');
      const response = await fetch(row.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-onlymob-event': row.eventKey,
          'x-onlymob-signature': `sha256=${signature}`,
        },
        body: row.payload,
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      delivered += 1;
      await platformPrisma.$executeRaw(Prisma.sql`
        UPDATE WebhookDelivery SET status='DELIVERED', attempts=${attempt}, httpStatus=${response.status}, deliveredAt=${new Date()}, lastError=NULL, nextAttemptAt=NULL WHERE id=${row.id}
      `);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido';
      const retryMinutes = Math.min(60, 5 * Math.pow(2, Math.max(0, attempt - 1)));
      await platformPrisma.$executeRaw(Prisma.sql`
        UPDATE WebhookDelivery SET status='FAILED', attempts=${attempt}, lastError=${message}, nextAttemptAt=${new Date(Date.now() + retryMinutes * 60_000)} WHERE id=${row.id}
      `);
    }
  }

  return { attempted: rows.length, delivered, failed };
}

export async function emitWebhookEvent(tenantId: string, eventKey: string, payload: unknown) {
  const queued = await queueWebhookEvent(tenantId, eventKey, payload);
  if (!queued.queued) return { attempted: 0, delivered: 0, failed: 0 };
  return dispatchPendingWebhooks({ tenantId, limit: queued.queued });
}
