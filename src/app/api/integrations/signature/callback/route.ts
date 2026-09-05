import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';
import { auditTenantAction } from '@/lib/tenant-guard';

export const dynamic = 'force-dynamic';

function authorized(request: NextRequest) {
  const secret = process.env.SIGNATURE_CALLBACK_SECRET;
  if (!secret || secret.length < 24) return false;
  const authorization = request.headers.get('authorization') || '';
  const provided = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : request.headers.get('x-onlymob-signature-secret') || '';
  if (!provided) return false;
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function mapStatus(value: unknown) {
  const status = String(value || '').trim().toUpperCase();
  if (['SIGNED', 'COMPLETED'].includes(status)) return 'SIGNED';
  if (['VIEWED', 'OPENED'].includes(status)) return 'VIEWED';
  if (['ARCHIVED', 'CANCELED', 'CANCELLED', 'DECLINED', 'REJECTED'].includes(status)) return 'ARCHIVED';
  if (['SENT', 'PENDING', 'CREATED', 'PROCESSING'].includes(status)) return 'SENT';
  return null;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tenant = await resolveTenantContext();
    const payload = await request.json() as Record<string, unknown>;
    const externalId = String(payload.externalId || payload.id || '').trim();
    const documentId = String(payload.documentId || '').trim();
    const workflowStatus = mapStatus(payload.status);
    if ((!externalId && !documentId) || !workflowStatus) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const rows = await platformPrisma.$queryRaw<Array<{ id: string; propertyId: string | null; renterId: string | null }>>(Prisma.sql`
      SELECT id, propertyId, renterId
      FROM Document
      WHERE tenantId=${tenant.id}
        AND (${documentId || null} IS NOT NULL AND id=${documentId || null}
          OR ${externalId || null} IS NOT NULL AND signatureExternalId=${externalId || null})
      LIMIT 1
    `);
    const document = rows[0];
    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const now = new Date();
    const metadata = JSON.stringify(payload).slice(0, 10000);
    await platformPrisma.$executeRaw(Prisma.sql`
      UPDATE Document
      SET workflowStatus=${workflowStatus},
          viewedAt=CASE WHEN ${workflowStatus} IN ('VIEWED','SIGNED') THEN COALESCE(viewedAt,${now}) ELSE viewedAt END,
          signedAt=CASE WHEN ${workflowStatus}='SIGNED' THEN COALESCE(signedAt,${now}) ELSE signedAt END,
          archivedAt=CASE WHEN ${workflowStatus}='ARCHIVED' THEN COALESCE(archivedAt,${now}) ELSE archivedAt END,
          workflowMetadata=${metadata}
      WHERE id=${document.id} AND tenantId=${tenant.id}
    `);

    await auditTenantAction({
      tenantId: tenant.id,
      action: 'DOCUMENT_UPDATED',
      entityType: 'Document',
      entityId: document.id,
      metadata: {
        propertyId: document.propertyId || undefined,
        renterId: document.renterId || undefined,
        workflowStatus,
        signatureExternalId: externalId || undefined,
        source: 'signature-callback',
      },
    });

    return NextResponse.json({ ok: true, documentId: document.id, workflowStatus });
  } catch (error) {
    console.error('[signature-callback]', error);
    return NextResponse.json({ error: 'Signature callback failed' }, { status: 500 });
  }
}
