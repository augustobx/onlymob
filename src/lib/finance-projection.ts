import 'server-only';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';

export async function ensureDefaultFinancialAccount(tenantId: string) {
  const rows = await platformPrisma.$queryRaw<Array<{ id:string }>>(Prisma.sql`SELECT id FROM FinancialAccount WHERE tenantId=${tenantId} AND isActive=true ORDER BY createdAt ASC LIMIT 1`);
  if (rows[0]) return rows[0].id;
  const id=randomUUID();
  await platformPrisma.$executeRaw(Prisma.sql`INSERT INTO FinancialAccount (id,tenantId,name,type,currency,isActive,createdAt,updatedAt) VALUES (${id},${tenantId},'Cuenta principal','BANK','ARS',true,${new Date()},${new Date()})`);
  return id;
}

export async function projectPaymentToFinance(tenantId:string,paymentId:string) {
  const payment=await platformPrisma.payment.findFirst({where:{id:paymentId,tenantId},include:{debt:{include:{propertyLease:{select:{propertyId:true}},renter:{select:{id:true,firstName:true,lastName:true}}}}}});
  if(!payment)return {created:false};
  const accountId=await ensureDefaultFinancialAccount(tenantId);
  const propertyId=payment.debt.propertyLease?.propertyId || null;
  const concept=`Cobro · ${payment.debt.description} · ${payment.debt.renter.firstName} ${payment.debt.renter.lastName}`;
  const inserted=await platformPrisma.$executeRaw(Prisma.sql`
    INSERT IGNORE INTO FinancialMovement (id,tenantId,accountId,type,amount,currency,concept,propertyId,renterId,debtId,paymentId,reference,reconciliationStatus,occurredAt,createdAt)
    VALUES (${randomUUID()},${tenantId},${accountId},'INCOME',${payment.amount},'ARS',${concept},${propertyId},${payment.debt.renterId},${payment.debtId},${payment.id},${payment.reference || payment.receiptNumber || null},'MATCHED',${payment.paidAt},${new Date()})
  `);
  return {created:Number(inserted||0)>0};
}

export async function backfillPaymentsToFinance(tenantId:string) {
  const accountId=await ensureDefaultFinancialAccount(tenantId);
  const inserted=await platformPrisma.$executeRaw(Prisma.sql`
    INSERT IGNORE INTO FinancialMovement (id,tenantId,accountId,type,amount,currency,concept,propertyId,renterId,debtId,paymentId,reference,reconciliationStatus,occurredAt,createdAt)
    SELECT UUID(),p.tenantId,${accountId},'INCOME',p.amount,'ARS',CONCAT('Cobro · ',d.description),pl.propertyId,d.renterId,d.id,p.id,COALESCE(p.reference,p.receiptNumber),'MATCHED',p.paidAt,NOW(3)
    FROM Payment p
    JOIN Debt d ON d.id=p.debtId AND d.tenantId=p.tenantId
    LEFT JOIN PropertyLease pl ON pl.id=d.propertyLeaseId AND pl.tenantId=d.tenantId
    WHERE p.tenantId=${tenantId}
  `);
  return {created:Number(inserted||0)};
}
