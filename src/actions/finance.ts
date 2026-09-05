'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';
import { auditTenantAction } from '@/lib/tenant-guard';
import { backfillPaymentsToFinance, ensureDefaultFinancialAccount } from '@/lib/finance-projection';

const AccountSchema=z.object({name:z.string().min(2).max(120),type:z.enum(['CASH','BANK','MERCADO_PAGO','OTHER']),currency:z.string().min(3).max(10).default('ARS'),bankName:z.string().max(120).optional().nullable(),alias:z.string().max(120).optional().nullable(),cbu:z.string().max(40).optional().nullable()});
const MovementSchema=z.object({accountId:z.string().min(1),type:z.enum(['INCOME','EXPENSE','ADJUSTMENT']),amount:z.number().positive(),currency:z.string().min(3).max(10).default('ARS'),concept:z.string().min(2).max(180),propertyId:z.string().optional().nullable(),contactId:z.string().optional().nullable(),renterId:z.string().optional().nullable(),reference:z.string().max(160).optional().nullable(),notes:z.string().max(5000).optional().nullable(),occurredAt:z.string().optional().nullable()});

function serialize<T>(value:T):T{return JSON.parse(JSON.stringify(value))}

export async function getFinanceDataAction(){
  const{tenant}=await requirePermission('finance','read');
  await ensureDefaultFinancialAccount(tenant.id);await backfillPaymentsToFinance(tenant.id);
  const[accounts,movements,properties,contacts,renters]=await Promise.all([
    platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT a.id,a.name,a.type,a.currency,a.bankName,a.alias,a.cbu,a.isActive,a.createdAt,COALESCE(SUM(CASE WHEN m.type='INCOME' THEN m.amount WHEN m.type='EXPENSE' THEN -m.amount ELSE m.amount END),0) AS balance FROM FinancialAccount a LEFT JOIN FinancialMovement m ON m.accountId=a.id AND m.tenantId=a.tenantId WHERE a.tenantId=${tenant.id} GROUP BY a.id,a.name,a.type,a.currency,a.bankName,a.alias,a.cbu,a.isActive,a.createdAt ORDER BY a.isActive DESC,a.createdAt ASC`),
    platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT m.id,m.accountId,m.type,m.amount,m.currency,m.concept,m.propertyId,m.contactId,m.renterId,m.reference,m.reconciliationStatus,m.notes,m.occurredAt,a.name AS accountName,p.code AS propertyCode,p.address AS propertyAddress,CONCAT(c.firstName,' ',c.lastName) AS contactName,CONCAT(r.firstName,' ',r.lastName) AS renterName FROM FinancialMovement m JOIN FinancialAccount a ON a.id=m.accountId AND a.tenantId=m.tenantId LEFT JOIN Property p ON p.id=m.propertyId AND p.tenantId=m.tenantId LEFT JOIN Contact c ON c.id=m.contactId AND c.tenantId=m.tenantId LEFT JOIN PropertyRenter r ON r.id=m.renterId AND r.tenantId=m.tenantId WHERE m.tenantId=${tenant.id} ORDER BY m.occurredAt DESC LIMIT 500`),
    platformPrisma.property.findMany({where:{tenantId:tenant.id,archivedAt:null},select:{id:true,code:true,address:true},orderBy:{code:'asc'}}),
    platformPrisma.contact.findMany({where:{tenantId:tenant.id,archivedAt:null,isActive:true},select:{id:true,firstName:true,lastName:true,companyName:true},orderBy:[{lastName:'asc'},{firstName:'asc'}]}),
    platformPrisma.propertyRenter.findMany({where:{tenantId:tenant.id,status:'ACTIVE'},select:{id:true,firstName:true,lastName:true,dni:true},orderBy:[{lastName:'asc'},{firstName:'asc'}]}),
  ]);
  return serialize({accounts,movements,properties,contacts,renters});
}

export async function createFinancialAccountAction(input:z.input<typeof AccountSchema>){
  const{tenant,session}=await requirePermission('finance','manage');const data=AccountSchema.parse(input);const id=randomUUID();
  await platformPrisma.$executeRaw(Prisma.sql`INSERT INTO FinancialAccount (id,tenantId,name,type,currency,bankName,alias,cbu,isActive,createdAt,updatedAt) VALUES (${id},${tenant.id},${data.name.trim()},${data.type},${data.currency.toUpperCase()},${data.bankName?.trim()||null},${data.alias?.trim()||null},${data.cbu?.trim()||null},true,${new Date()},${new Date()})`);
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'FINANCIAL_ACCOUNT_CREATED',entityType:'FinancialAccount',entityId:id,metadata:{name:data.name,type:data.type}});revalidatePath('/finanzas');return{success:true,id};
}

export async function createFinancialMovementAction(input:z.input<typeof MovementSchema>){
  const{tenant,session}=await requirePermission('finance','create');const data=MovementSchema.parse(input);
  const account=await platformPrisma.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM FinancialAccount WHERE id=${data.accountId} AND tenantId=${tenant.id} AND isActive=true LIMIT 1`);if(!account[0])throw new Error('Cuenta financiera inválida.');
  if(data.propertyId&&!await platformPrisma.property.findFirst({where:{id:data.propertyId,tenantId:tenant.id}}))throw new Error('Propiedad inválida.');
  if(data.contactId&&!await platformPrisma.contact.findFirst({where:{id:data.contactId,tenantId:tenant.id}}))throw new Error('Contacto inválido.');
  if(data.renterId&&!await platformPrisma.propertyRenter.findFirst({where:{id:data.renterId,tenantId:tenant.id}}))throw new Error('Inquilino inválido.');
  const id=randomUUID();const occurredAt=data.occurredAt?new Date(data.occurredAt):new Date();if(Number.isNaN(occurredAt.getTime()))throw new Error('Fecha inválida.');
  await platformPrisma.$executeRaw(Prisma.sql`INSERT INTO FinancialMovement (id,tenantId,accountId,type,amount,currency,concept,propertyId,contactId,renterId,reference,reconciliationStatus,notes,occurredAt,createdAt) VALUES (${id},${tenant.id},${data.accountId},${data.type},${data.amount},${data.currency.toUpperCase()},${data.concept.trim()},${data.propertyId||null},${data.contactId||null},${data.renterId||null},${data.reference?.trim()||null},'PENDING',${data.notes?.trim()||null},${occurredAt},${new Date()})`);
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'FINANCIAL_MOVEMENT_CREATED',entityType:'FinancialMovement',entityId:id,metadata:{propertyId:data.propertyId||undefined,contactId:data.contactId||undefined,renterId:data.renterId||undefined,type:data.type,amount:data.amount}});revalidatePath('/finanzas');if(data.propertyId)revalidatePath(`/propiedades/${data.propertyId}`);return{success:true,id};
}

export async function transferFinancialAction(input:{fromAccountId:string;toAccountId:string;amount:number;currency?:string;concept?:string}){
  const{tenant,session}=await requirePermission('finance','manage');if(input.fromAccountId===input.toAccountId)throw new Error('Seleccioná dos cuentas distintas.');if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error('Importe inválido.');
  const accounts=await platformPrisma.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM FinancialAccount WHERE tenantId=${tenant.id} AND isActive=true AND id IN (${input.fromAccountId},${input.toAccountId})`);if(accounts.length!==2)throw new Error('Cuenta inválida.');
  const reference=`TRF-${Date.now()}`;const now=new Date();const currency=(input.currency||'ARS').toUpperCase();const concept=input.concept?.trim()||'Transferencia entre cuentas';
  await platformPrisma.$transaction(async(tx)=>{await tx.$executeRaw(Prisma.sql`INSERT INTO FinancialMovement (id,tenantId,accountId,type,amount,currency,concept,reference,reconciliationStatus,occurredAt,createdAt) VALUES (${randomUUID()},${tenant.id},${input.fromAccountId},'EXPENSE',${input.amount},${currency},${concept},${reference},'MATCHED',${now},${now})`);await tx.$executeRaw(Prisma.sql`INSERT INTO FinancialMovement (id,tenantId,accountId,type,amount,currency,concept,reference,reconciliationStatus,occurredAt,createdAt) VALUES (${randomUUID()},${tenant.id},${input.toAccountId},'INCOME',${input.amount},${currency},${concept},${reference},'MATCHED',${now},${now})`)});
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'FINANCIAL_TRANSFER_CREATED',entityType:'FinancialAccount',metadata:{fromAccountId:input.fromAccountId,toAccountId:input.toAccountId,amount:input.amount,reference}});revalidatePath('/finanzas');return{success:true,reference};
}

export async function setFinancialReconciliationAction(movementId:string,status:'PENDING'|'MATCHED'|'IGNORED'){
  const{tenant}=await requirePermission('finance','update');const changed=await platformPrisma.$executeRaw(Prisma.sql`UPDATE FinancialMovement SET reconciliationStatus=${status} WHERE id=${movementId} AND tenantId=${tenant.id}`);if(!changed)throw new Error('Movimiento no encontrado.');revalidatePath('/finanzas');return{success:true};
}
