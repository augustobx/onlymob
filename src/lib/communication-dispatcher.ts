import 'server-only';

import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';

function htmlEscape(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[char] || char);
}

async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) throw new Error('RESEND_API_KEY/RESEND_FROM no configurados.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${htmlEscape(body)}</div>`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok) throw new Error(`Resend ${response.status}: ${data?.message || 'error de envío'}`);
  return String(data?.id || '');
}

async function sendWhatsApp(to: string, body: string) {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.META_GRAPH_VERSION;
  if (!token || !phoneNumberId || !graphVersion) throw new Error('META_WHATSAPP_TOKEN/META_WHATSAPP_PHONE_NUMBER_ID/META_GRAPH_VERSION no configurados.');
  const normalized = to.replace(/\D/g, '');
  if (normalized.length < 8) throw new Error('Número de WhatsApp inválido.');
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: normalized, type: 'text', text: { preview_url: false, body } }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok) throw new Error(`WhatsApp ${response.status}: ${data?.error?.message || 'error de envío'}`);
  return String(data?.messages?.[0]?.id || '');
}

export async function dispatchPendingCommunications(input: { tenantId?: string | null; limit?: number } = {}) {
  const limit = Math.max(1, Math.min(input.limit || 30, 100));
  const tenantFilter = input.tenantId ? Prisma.sql`AND m.tenantId=${input.tenantId}` : Prisma.sql``;
  const rows = await platformPrisma.$queryRaw<Array<{ id:string; tenantId:string; threadId:string; channel:string; recipientAddress:string|null; body:string; subject:string }>>(Prisma.sql`
    SELECT m.id,m.tenantId,m.threadId,m.channel,m.recipientAddress,m.body,t.subject
    FROM CommunicationMessage m
    JOIN CommunicationThread t ON t.id=m.threadId AND t.tenantId=m.tenantId
    WHERE m.status='QUEUED' AND m.channel IN ('EMAIL','WHATSAPP') ${tenantFilter}
    ORDER BY m.createdAt ASC LIMIT ${limit}
  `);

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      if (!row.recipientAddress) throw new Error('Destinatario no configurado.');
      const externalId = row.channel === 'EMAIL'
        ? await sendEmail(row.recipientAddress, row.subject, row.body)
        : await sendWhatsApp(row.recipientAddress, row.body);
      sent += 1;
      await platformPrisma.$executeRaw(Prisma.sql`
        UPDATE CommunicationMessage SET status='SENT',externalId=${externalId || null},sentAt=${new Date()},failureMessage=NULL WHERE id=${row.id} AND tenantId=${row.tenantId}
      `);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message.slice(0,500) : 'Error desconocido';
      await platformPrisma.$executeRaw(Prisma.sql`
        UPDATE CommunicationMessage SET status='FAILED',failureMessage=${message} WHERE id=${row.id} AND tenantId=${row.tenantId}
      `);
    }
  }
  return { attempted: rows.length, sent, failed };
}
