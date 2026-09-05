import { NextResponse } from 'next/server';
import { platformPrisma } from '@/lib/prisma-core';
import { authenticateApiRequest, emitWebhookEvent } from '@/lib/integrations';
import { parseCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request, 'import:leads');
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const text = await request.text();
  if (text.length > 2_000_000) return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 413 });
  const rows = parseCsv(text);
  if (rows.length < 2) return NextResponse.json({ error: 'EMPTY_CSV' }, { status: 400 });
  const header = rows[0].map((h) => h.trim());
  const required = ['firstName','lastName','title'];
  if (required.some((name) => !header.includes(name))) return NextResponse.json({ error: 'INVALID_HEADERS', required }, { status: 400 });
  const bodyRows = rows.slice(1, 501);
  let created = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < bodyRows.length; i += 1) {
    const record = Object.fromEntries(header.map((key, index) => [key, bodyRows[i][index] || '']));
    try {
      const firstName = record.firstName.trim(); const lastName = record.lastName.trim(); const title = record.title.trim();
      if (!firstName || !lastName || !title) throw new Error('firstName, lastName y title son obligatorios');
      const lead = await platformPrisma.$transaction(async (tx) => {
        const email = record.email?.trim().toLowerCase() || null;
        let contact = email ? await tx.contact.findFirst({ where: { tenantId: auth.tenantId, email, archivedAt: null } }) : null;
        if (!contact) {
          contact = await tx.contact.create({ data: { tenantId: auth.tenantId, firstName, lastName, email, phone: record.phone?.trim() || null } });
          await tx.contactRole.create({ data: { contactId: contact.id, role: 'PROSPECT' } });
        }
        return tx.lead.create({ data: { tenantId: auth.tenantId, contactId: contact.id, title, source: record.source?.trim() || 'CSV', channel: record.channel?.trim() || 'IMPORT', notes: record.notes?.trim() || null } });
      });
      created += 1;
      void emitWebhookEvent(auth.tenantId, 'lead.created', { leadId: lead.id, title: lead.title }).catch(() => undefined);
    } catch (error) { errors.push({ row: i + 2, error: error instanceof Error ? error.message : 'Error desconocido' }); }
  }
  return NextResponse.json({ data: { created, errors, truncated: rows.length > 501 } });
}
