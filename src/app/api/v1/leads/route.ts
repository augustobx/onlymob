import { NextResponse } from 'next/server';
import { z } from 'zod';
import { platformPrisma } from '@/lib/prisma-core';
import { authenticateApiRequest, emitWebhookEvent } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

const LeadInput = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(120).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  title: z.string().min(2).max(180),
  source: z.string().max(100).optional().nullable(),
  channel: z.string().max(60).optional().nullable(),
  notes: z.string().max(6000).optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, 'read:leads');
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const rows = await platformPrisma.lead.findMany({
    where: { tenantId: auth.tenantId },
    include: { contact: { select: { firstName: true, lastName: true, email: true, phone: true } }, agent: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }, take: 500,
  });
  return NextResponse.json({ data: rows });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request, 'write:leads');
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const parsed = LeadInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY', details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const lead = await platformPrisma.$transaction(async (tx) => {
    let contact = data.email ? await tx.contact.findFirst({ where: { tenantId: auth.tenantId, email: data.email.toLowerCase(), archivedAt: null } }) : null;
    if (!contact) {
      contact = await tx.contact.create({ data: { tenantId: auth.tenantId, firstName: data.firstName.trim(), lastName: data.lastName.trim(), email: data.email?.toLowerCase() || null, phone: data.phone?.trim() || null } });
      await tx.contactRole.create({ data: { contactId: contact.id, role: 'PROSPECT' } });
    }
    return tx.lead.create({ data: { tenantId: auth.tenantId, contactId: contact.id, title: data.title.trim(), source: data.source?.trim() || 'API', channel: data.channel?.trim() || 'API', notes: data.notes?.trim() || null } });
  });
  void emitWebhookEvent(auth.tenantId, 'lead.created', { leadId: lead.id, title: lead.title }).catch(() => undefined);
  return NextResponse.json({ data: { id: lead.id } }, { status: 201 });
}
