'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';
import { auditTenantAction } from '@/lib/tenant-guard';
import { dispatchPendingCommunications } from '@/lib/communication-dispatcher';
import { getOwnerSession, getRenterSession } from '@/lib/auth';
import { resolveTenantContext } from '@/lib/tenant-context';

const CHANNELS = ['INTERNAL','EMAIL','WHATSAPP'] as const;
const AUDIENCES = ['OWNER','RENTER','CONTACT'] as const;
const ThreadSchema = z.object({
  subject: z.string().min(2).max(180),
  propertyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  renterId: z.string().optional().nullable(),
  audienceType: z.enum(AUDIENCES),
  channel: z.enum(CHANNELS),
  body: z.string().min(1).max(10000),
});

function serialize<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

async function assertLinks(tenantId: string, input: { propertyId?: string|null; contactId?: string|null; renterId?: string|null }) {
  const [property, contact, renter] = await Promise.all([
    input.propertyId ? platformPrisma.property.findFirst({ where: { id: input.propertyId, tenantId, archivedAt: null }, select: { id:true, code:true, address:true } }) : null,
    input.contactId ? platformPrisma.contact.findFirst({ where: { id: input.contactId, tenantId, archivedAt: null }, select: { id:true, firstName:true, lastName:true, companyName:true, email:true, phone:true } }) : null,
    input.renterId ? platformPrisma.propertyRenter.findFirst({ where: { id: input.renterId, tenantId }, select: { id:true, firstName:true, lastName:true, email:true, phone:true } }) : null,
  ]);
  if (input.propertyId && !property) throw new Error('Propiedad inválida.');
  if (input.contactId && !contact) throw new Error('Contacto inválido.');
  if (input.renterId && !renter) throw new Error('Inquilino inválido.');
  return { property, contact, renter };
}

function recipient(input: { audienceType:string; channel:string }, links: any) {
  const target = input.audienceType === 'RENTER' ? links.renter : links.contact;
  if (!target) throw new Error(input.audienceType === 'RENTER' ? 'Seleccioná un inquilino.' : 'Seleccioná un contacto.');
  if (input.channel === 'INTERNAL' && !['RENTER','OWNER'].includes(input.audienceType)) throw new Error('Los mensajes internos sólo pueden dirigirse a portal de inquilino o propietario.');
  if (input.channel === 'EMAIL' && !target.email) throw new Error('El destinatario no tiene email cargado.');
  if (input.channel === 'WHATSAPP' && !target.phone) throw new Error('El destinatario no tiene teléfono cargado.');
  return {
    refId: target.id,
    address: input.channel === 'EMAIL' ? target.email : input.channel === 'WHATSAPP' ? target.phone : null,
  };
}

async function insertMessage(input: {
  tenantId:string; threadId:string; channel:string; audienceType:string; recipientRefId:string; recipientAddress:string|null; body:string; senderUserId:string;
}) {
  const id = randomUUID();
  const status = input.channel === 'INTERNAL' ? 'SENT' : 'QUEUED';
  const now = new Date();
  await platformPrisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO CommunicationMessage (id,tenantId,threadId,channel,direction,senderUserId,audienceType,recipientRefId,recipientAddress,body,status,sentAt,createdAt)
      VALUES (${id},${input.tenantId},${input.threadId},${input.channel},'OUTBOUND',${input.senderUserId},${input.audienceType},${input.recipientRefId},${input.recipientAddress},${input.body},${status},${status === 'SENT' ? now : null},${now})
    `);
    await tx.$executeRaw(Prisma.sql`UPDATE CommunicationThread SET lastMessageAt=${now},updatedAt=${now} WHERE id=${input.threadId} AND tenantId=${input.tenantId}`);
  });
  return { id, status };
}

export async function getCommunicationCenterAction() {
  const { tenant } = await requirePermission('communications','read');
  const [threads, properties, contacts, renters] = await Promise.all([
    platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`
      SELECT t.id,t.subject,t.status,t.propertyId,t.contactId,t.renterId,t.lastMessageAt,t.createdAt,t.updatedAt,
             p.code AS propertyCode,p.address AS propertyAddress,
             CONCAT(c.firstName,' ',c.lastName) AS contactName,c.companyName AS contactCompany,
             CONCAT(r.firstName,' ',r.lastName) AS renterName,
             COUNT(m.id) AS messageCount,
             SUM(CASE WHEN m.status='FAILED' THEN 1 ELSE 0 END) AS failedCount
      FROM CommunicationThread t
      LEFT JOIN Property p ON p.id=t.propertyId AND p.tenantId=t.tenantId
      LEFT JOIN Contact c ON c.id=t.contactId AND c.tenantId=t.tenantId
      LEFT JOIN PropertyRenter r ON r.id=t.renterId AND r.tenantId=t.tenantId
      LEFT JOIN CommunicationMessage m ON m.threadId=t.id AND m.tenantId=t.tenantId
      WHERE t.tenantId=${tenant.id}
      GROUP BY t.id,t.subject,t.status,t.propertyId,t.contactId,t.renterId,t.lastMessageAt,t.createdAt,t.updatedAt,p.code,p.address,c.firstName,c.lastName,c.companyName,r.firstName,r.lastName
      ORDER BY COALESCE(t.lastMessageAt,t.updatedAt) DESC LIMIT 200
    `),
    platformPrisma.property.findMany({ where:{tenantId:tenant.id,archivedAt:null},select:{id:true,code:true,address:true},orderBy:{code:'asc'} }),
    platformPrisma.contact.findMany({ where:{tenantId:tenant.id,archivedAt:null,isActive:true},select:{id:true,firstName:true,lastName:true,companyName:true,email:true,phone:true,roles:true},orderBy:[{lastName:'asc'},{firstName:'asc'}] }),
    platformPrisma.propertyRenter.findMany({ where:{tenantId:tenant.id,status:'ACTIVE'},select:{id:true,firstName:true,lastName:true,dni:true,email:true,phone:true},orderBy:[{lastName:'asc'},{firstName:'asc'}] }),
  ]);
  return serialize({ threads, properties, contacts, renters });
}

export async function getCommunicationThreadAction(threadId:string) {
  const { tenant } = await requirePermission('communications','read');
  const rows = await platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`
    SELECT m.id,m.channel,m.direction,m.audienceType,m.recipientRefId,m.recipientAddress,m.body,m.status,m.externalId,m.failureMessage,m.sentAt,m.deliveredAt,m.readAt,m.createdAt,u.name AS senderName
    FROM CommunicationMessage m LEFT JOIN User u ON u.id=m.senderUserId AND u.tenantId=m.tenantId
    WHERE m.tenantId=${tenant.id} AND m.threadId=${threadId} ORDER BY m.createdAt ASC
  `);
  return serialize(rows);
}

export async function createCommunicationThreadAction(input:z.input<typeof ThreadSchema>) {
  const { tenant, session } = await requirePermission('communications','create');
  const data = ThreadSchema.parse(input);
  const links = await assertLinks(tenant.id,data);
  const target = recipient(data,links);
  const threadId = randomUUID();
  const now = new Date();
  await platformPrisma.$executeRaw(Prisma.sql`
    INSERT INTO CommunicationThread (id,tenantId,propertyId,contactId,renterId,subject,status,createdAt,updatedAt)
    VALUES (${threadId},${tenant.id},${data.propertyId || null},${data.contactId || null},${data.renterId || null},${data.subject.trim()},'OPEN',${now},${now})
  `);
  const message = await insertMessage({ tenantId:tenant.id,threadId,channel:data.channel,audienceType:data.audienceType,recipientRefId:target.refId,recipientAddress:target.address,body:data.body.trim(),senderUserId:session.userId });
  await auditTenantAction({ tenantId:tenant.id,actorUserId:session.userId,action:'COMMUNICATION_SENT',entityType:'CommunicationThread',entityId:threadId,metadata:{propertyId:data.propertyId || undefined,contactId:data.contactId || undefined,renterId:data.renterId || undefined,channel:data.channel,audienceType:data.audienceType,messageId:message.id} });
  if (data.channel !== 'INTERNAL') await dispatchPendingCommunications({tenantId:tenant.id,limit:1});
  revalidatePath('/comunicaciones');
  if (data.propertyId) revalidatePath(`/propiedades/${data.propertyId}`);
  if (data.contactId) revalidatePath(`/contactos/${data.contactId}`);
  return {success:true,threadId};
}

export async function sendCommunicationMessageAction(input:{threadId:string;channel:typeof CHANNELS[number];audienceType:typeof AUDIENCES[number];body:string}) {
  const { tenant, session } = await requirePermission('communications','create');
  const body = z.string().min(1).max(10000).parse(input.body);
  const threadRows = await platformPrisma.$queryRaw<Array<{id:string;propertyId:string|null;contactId:string|null;renterId:string|null}>>(Prisma.sql`SELECT id,propertyId,contactId,renterId FROM CommunicationThread WHERE id=${input.threadId} AND tenantId=${tenant.id} LIMIT 1`);
  const thread = threadRows[0]; if (!thread) throw new Error('Conversación no encontrada.');
  const links = await assertLinks(tenant.id,thread);
  const target = recipient(input,links);
  const message = await insertMessage({tenantId:tenant.id,threadId:thread.id,channel:input.channel,audienceType:input.audienceType,recipientRefId:target.refId,recipientAddress:target.address,body:body.trim(),senderUserId:session.userId});
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'COMMUNICATION_SENT',entityType:'CommunicationThread',entityId:thread.id,metadata:{propertyId:thread.propertyId || undefined,contactId:thread.contactId || undefined,renterId:thread.renterId || undefined,channel:input.channel,audienceType:input.audienceType,messageId:message.id}});
  if (input.channel !== 'INTERNAL') await dispatchPendingCommunications({tenantId:tenant.id,limit:1});
  revalidatePath('/comunicaciones');
  return {success:true,messageId:message.id};
}

export async function setCommunicationThreadStatusAction(threadId:string,status:'OPEN'|'CLOSED') {
  const {tenant}=await requirePermission('communications','update');
  await platformPrisma.$executeRaw(Prisma.sql`UPDATE CommunicationThread SET status=${status},updatedAt=${new Date()} WHERE id=${threadId} AND tenantId=${tenant.id}`);
  revalidatePath('/comunicaciones'); return {success:true};
}

async function portalMessages(tenantId:string,audienceType:'RENTER'|'OWNER',recipientRefId:string) {
  const rows=await platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`
    SELECT m.id,m.threadId,m.channel,m.direction,m.body,m.status,m.sentAt,m.readAt,m.createdAt,t.subject,t.propertyId,p.code AS propertyCode,p.address AS propertyAddress
    FROM CommunicationMessage m JOIN CommunicationThread t ON t.id=m.threadId AND t.tenantId=m.tenantId
    LEFT JOIN Property p ON p.id=t.propertyId AND p.tenantId=t.tenantId
    WHERE m.tenantId=${tenantId} AND m.channel='INTERNAL' AND m.audienceType=${audienceType} AND m.recipientRefId=${recipientRefId}
    ORDER BY m.createdAt DESC LIMIT 100
  `);
  return serialize(rows);
}

export async function getRenterPortalCommunicationsAction() {
  const tenant=await resolveTenantContext(); const session=await getRenterSession(tenant.id); if(!session) throw new Error('UNAUTHORIZED');
  return portalMessages(tenant.id,'RENTER',session.renterId);
}

export async function getOwnerPortalCommunicationsAction() {
  const tenant=await resolveTenantContext(); const session=await getOwnerSession(tenant.id); if(!session) throw new Error('UNAUTHORIZED');
  return portalMessages(tenant.id,'OWNER',session.ownerContactId);
}

export async function markPortalCommunicationReadAction(messageId:string, audience:'RENTER'|'OWNER') {
  const tenant=await resolveTenantContext();
  const session=audience==='RENTER' ? await getRenterSession(tenant.id) : await getOwnerSession(tenant.id);
  if(!session) throw new Error('UNAUTHORIZED');
  const refId=audience==='RENTER' ? (session as any).renterId : (session as any).ownerContactId;
  await platformPrisma.$executeRaw(Prisma.sql`UPDATE CommunicationMessage SET readAt=COALESCE(readAt,${new Date()}),status=IF(status='SENT','READ',status) WHERE id=${messageId} AND tenantId=${tenant.id} AND audienceType=${audience} AND recipientRefId=${refId}`);
  return {success:true};
}
