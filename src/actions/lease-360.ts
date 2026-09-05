'use server';

import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';

export async function getLease360Action(leaseId:string){
 const{tenant}=await requirePermission('leases','read');
 const lease=await platformPrisma.propertyLease.findFirst({where:{id:leaseId,tenantId:tenant.id},include:{
  property:{include:{owners:{include:{contact:true},orderBy:[{isPrimary:'desc'},{createdAt:'asc'}]},agent:{select:{id:true,name:true,email:true}}}},
  renter:true,guarantor:true,rentHistory:{orderBy:{changeDate:'desc'}},recurringCharges:{orderBy:{createdAt:'desc'}},
  debts:{include:{payments:{orderBy:{paidAt:'desc'}}},orderBy:{dueDate:'desc'}},documents:{orderBy:{uploadedAt:'desc'}},deal:{include:{contact:true,agent:{select:{id:true,name:true}}}},
 }});if(!lease)return null;
 const[maintenance,inspections,activity,financial]=await Promise.all([
  platformPrisma.maintenanceRequest.findMany({where:{tenantId:tenant.id,propertyLeaseId:lease.id},include:{provider:true,events:{orderBy:{createdAt:'desc'},take:20}},orderBy:{updatedAt:'desc'}}),
  platformPrisma.inspection.findMany({where:{tenantId:tenant.id,propertyLeaseId:lease.id},include:{inspector:{select:{id:true,name:true}},findings:true,documents:true},orderBy:{createdAt:'desc'}}),
  platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT a.id,a.eventKey,a.title,a.description,a.entityType,a.entityId,a.metadata,a.createdAt,u.name AS actorName FROM ActivityEvent a LEFT JOIN User u ON u.id=a.actorUserId AND u.tenantId=a.tenantId WHERE a.tenantId=${tenant.id} AND (a.entityType='PropertyLease' AND a.entityId=${lease.id} OR a.propertyId=${lease.propertyId} AND a.renterId=${lease.renterId}) ORDER BY a.createdAt DESC LIMIT 200`),
  platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT fm.id,fm.type,fm.amount,fm.currency,fm.concept,fm.reference,fm.reconciliationStatus,fm.occurredAt,fa.name AS accountName FROM FinancialMovement fm JOIN FinancialAccount fa ON fa.id=fm.accountId AND fa.tenantId=fm.tenantId WHERE fm.tenantId=${tenant.id} AND (fm.debtId IN (SELECT id FROM Debt WHERE propertyLeaseId=${lease.id} AND tenantId=${tenant.id}) OR fm.propertyId=${lease.propertyId} AND fm.renterId=${lease.renterId}) ORDER BY fm.occurredAt DESC LIMIT 200`),
 ]);
 return JSON.parse(JSON.stringify({lease,maintenance,inspections,activity,financial}));
}
