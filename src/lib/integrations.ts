import 'server-only';

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';

export const API_SCOPES = ['read:properties','read:leads','write:leads','export:properties','import:leads'] as const;
export const WEBHOOK_EVENTS = ['lead.created','property.updated','reservation.created','deal.won','payment.registered','maintenance.updated','settlement.ready'] as const;

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
  const rows = await platformPrisma.$queryRaw<Array<{ id: string; tenantId: string; tokenHash: string; scopes: string; isActive: number | boolean; expiresAt: Date | null }>>(Prisma.sql`
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

export async function emitWebhookEvent(tenantId: string, eventKey: string, payload: unknown) {
  const rows = await platformPrisma.$queryRaw<Array<{ id: string; url: string; events: string }>>(Prisma.sql`
    SELECT id, url, events FROM WebhookEndpoint WHERE tenantId = ${tenantId} AND isActive = true
  `);
  const matching = rows.filter((row) => {
    try { return (JSON.parse(row.events) as string[]).includes(eventKey); } catch { return false; }
  });
  if (!matching.length) return { attempted: 0, delivered: 0 };
  const secret = webhookSecret();
  const body = json({ id: randomUUID(), event: eventKey, occurredAt: new Date().toISOString(), data: payload });
  let delivered = 0;

  for (const endpoint of matching) {
    const deliveryId = randomUUID();
    await platformPrisma.$executeRaw(Prisma.sql`
      INSERT INTO WebhookDelivery (id, tenantId, endpointId, eventKey, payload, status, attempts, createdAt)
      VALUES (${deliveryId}, ${tenantId}, ${endpoint.id}, ${eventKey}, ${body}, 'PENDING', 0, ${new Date()})
    `);
    if (!secret) {
      await platformPrisma.$executeRaw(Prisma.sql`UPDATE WebhookDelivery SET status='FAILED', attempts=1, lastError='INTEGRATION_WEBHOOK_SECRET no configurado' WHERE id=${deliveryId}`);
      continue;
    }
    try {
      const signature = createHmac('sha256', secret).update(body).digest('hex');
      const response = await fetch(endpoint.url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-onlymob-event': eventKey, 'x-onlymob-signature': `sha256=${signature}` }, body, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      delivered += 1;
      await platformPrisma.$executeRaw(Prisma.sql`UPDATE WebhookDelivery SET status='DELIVERED', attempts=1, httpStatus=${response.status}, deliveredAt=${new Date()} WHERE id=${deliveryId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido';
      await platformPrisma.$executeRaw(Prisma.sql`UPDATE WebhookDelivery SET status='FAILED', attempts=1, lastError=${message} WHERE id=${deliveryId}`);
    }
  }
  return { attempted: matching.length, delivered };
}
