import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  try {
    await platformPrisma.$queryRaw`SELECT 1`;
    const rows = await platformPrisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name IN ('Tenant','Property','Lead','MaintenanceRequest','NotificationLog','DocumentTemplate','ApiCredential','WebhookEndpoint')
    `);
    const schemaReady = Number(rows[0]?.count || 0) === 8;
    return NextResponse.json({ status: schemaReady ? 'ready' : 'degraded', service: 'onlymob', database: 'ok', schema: schemaReady ? 'ready' : 'incomplete', latencyMs: Date.now()-started, timestamp: new Date().toISOString() }, { status: schemaReady ? 200 : 503, headers: { 'Cache-Control':'no-store' } });
  } catch (error) {
    console.error('[health]', error);
    return NextResponse.json({ status:'degraded', service:'onlymob', database:'error', timestamp:new Date().toISOString() }, { status:503, headers:{'Cache-Control':'no-store'} });
  }
}
