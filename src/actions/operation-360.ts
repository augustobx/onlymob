'use server';

import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';

export async function getOperation360Action(dealId:string){
 const{tenant}=await requirePermission('operations','read');
 const deal=await platformPrisma.deal.findFirst({where:{id:dealId,tenantId:tenant.id},include:{
  property:{include:{owners:{include:{contact:true},orderBy:[{isPrimary:'desc'},{createdAt:'asc'}]},publications:{orderBy:{updatedAt:'desc'}},documents:{orderBy:{uploadedAt:'desc'}}}},
  contact:true,lead:{include:{interactions:{orderBy:{occurredAt:'desc'}},propertyInterests:{include:{property:{select:{id:true,code:true,address:true}}},orderBy:{updatedAt:'desc'}}}},agent:{select:{id:true,name:true,email:true}},reservation:true,propertyLease:{include:{renter:true,debts:{include:{payments:true}}}},
 }});if(!deal)return null;
 const[activity,communications,documents]=await Promise.all([
  platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT a.id,a.eventKey,a.title,a.description,a.entityType,a.entityId,a.metadata,a.createdAt,u.name AS actorName FROM ActivityEvent a LEFT JOIN User u ON u.id=a.actorUserId AND u.tenantId=a.tenantId WHERE a.tenantId=${tenant.id} AND (a.entityType='Deal' AND a.entityId=${deal.id} OR a.propertyId=${deal.propertyId} OR a.contactId=${deal.contactId}) ORDER BY a.createdAt DESC LIMIT 180`),
  platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT t.id,t.subject,t.status,t.lastMessageAt,t.updatedAt,COUNT(m.id) AS messageCount FROM CommunicationThread t LEFT JOIN CommunicationMessage m ON m.threadId=t.id AND m.tenantId=t.tenantId WHERE t.tenantId=${tenant.id} AND (t.propertyId=${deal.propertyId} OR t.contactId=${deal.contactId}) GROUP BY t.id,t.subject,t.status,t.lastMessageAt,t.updatedAt ORDER BY COALESCE(t.lastMessageAt,t.updatedAt) DESC LIMIT 50`),
  platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT id,fileName,category,fileUrl,uploadedAt,workflowStatus,version FROM Document WHERE tenantId=${tenant.id} AND dealId=${deal.id} ORDER BY uploadedAt DESC`),
 ]);
 return JSON.parse(JSON.stringify({deal:{...deal,documents},activity,communications}));
}
