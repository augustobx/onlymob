'use server';

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { getSuperAdminSession } from '@/lib/auth';
import { getTenantEntitlements, getTenantUsage } from '@/lib/saas';

function hash(value:string) { return createHash('sha256').update(value).digest('hex'); }
async function requireSuper() { const session=await getSuperAdminSession(); if(!session || session.role!=='SUPERADMIN') throw new Error('Acceso no autorizado.'); return session; }

export async function getSaasPlatformAction() {
  const session = await getSuperAdminSession();
  if (!session) throw new Error('Acceso no autorizado.');
  const [tenants, plans, activeSubs, users, properties] = await Promise.all([
    platformPrisma.tenant.findMany({ include: { domains: true, featureOverrides: true }, orderBy: { createdAt: 'desc' } }),
    platformPrisma.$queryRaw<Array<{id:string;code:string;name:string;priceMonthly:any;maxProperties:number;maxUsers:number;maxPublications:number;isActive:number|boolean}>>(Prisma.sql`SELECT id,code,name,priceMonthly,maxProperties,maxUsers,maxPublications,isActive FROM Plan ORDER BY priceMonthly ASC`),
    platformPrisma.tenantSubscription.findMany({ where: { status: { in: ['ACTIVE','TRIAL','PAST_DUE'] } }, include: { plan: true } }),
    platformPrisma.user.count({ where: { isActive: true } }),
    platformPrisma.property.count({ where: { archivedAt: null, status: { not: 'ARCHIVADO' } } }),
  ]);
  const details = await Promise.all(tenants.map(async (tenant) => ({
    id:tenant.id, name:tenant.name, slug:tenant.slug, status:tenant.status, domain:tenant.domains.find((x)=>x.isPrimary)?.hostname || tenant.domains[0]?.hostname || null,
    entitlement:await getTenantEntitlements(tenant.id), usage:await getTenantUsage(tenant.id),
    features:Object.fromEntries(tenant.featureOverrides.map((x)=>[x.featureKey,x.enabled])),
  })));
  const mrr = activeSubs.filter((x)=>x.status==='ACTIVE'||x.status==='PAST_DUE').reduce((sum,x)=>sum+Number(x.plan.priceMonthly),0);
  return { metrics:{ tenants:tenants.length, activeTenants:tenants.filter((x)=>x.status==='ACTIVE').length, trials:activeSubs.filter((x)=>x.status==='TRIAL').length, pastDue:activeSubs.filter((x)=>x.status==='PAST_DUE').length, mrr, users, properties }, plans:plans.map((p)=>({...p,priceMonthly:Number(p.priceMonthly),isActive:Boolean(p.isActive)})), tenants:details };
}

export async function updateTenantSubscriptionAction(input:{tenantId:string;planId:string;status:'TRIAL'|'ACTIVE'|'PAST_DUE'|'SUSPENDED'|'CANCELED';trialDays?:number}) {
  const session=await requireSuper();
  const [tenant,plan,current]=await Promise.all([
    platformPrisma.tenant.findUnique({where:{id:input.tenantId}}), platformPrisma.plan.findUnique({where:{id:input.planId}}), platformPrisma.tenantSubscription.findFirst({where:{tenantId:input.tenantId},include:{plan:true},orderBy:{createdAt:'desc'}}),
  ]);
  if(!tenant||!plan) throw new Error('Tenant o plan inexistente.');
  const now=new Date(); const end=new Date(now.getTime()+30*86400000); const trialEnds=input.status==='TRIAL'?new Date(now.getTime()+Math.max(1,Math.min(input.trialDays||15,90))*86400000):null;
  const subscription=current ? await platformPrisma.tenantSubscription.update({where:{id:current.id},data:{planId:plan.id,status:input.status,currentPeriodStart:now,currentPeriodEnd:end,trialEndsAt:trialEnds}}) : await platformPrisma.tenantSubscription.create({data:{tenantId:tenant.id,planId:plan.id,status:input.status,currentPeriodStart:now,currentPeriodEnd:end,trialEndsAt:trialEnds}});
  await platformPrisma.$executeRaw(Prisma.sql`INSERT INTO SubscriptionEvent (id,tenantId,subscriptionId,actorSuperAdminId,eventType,fromStatus,toStatus,fromPlanCode,toPlanCode,metadata,createdAt) VALUES (${randomUUID()},${tenant.id},${subscription.id},${session.superAdminId},'SUBSCRIPTION_CHANGED',${current?.status||null},${input.status},${current?.plan.code||null},${plan.code},${JSON.stringify({trialEndsAt:trialEnds})},${now})`);
  await platformPrisma.auditLog.create({data:{tenantId:tenant.id,actorType:'SUPERADMIN',action:'SUBSCRIPTION_CHANGED',entityType:'TenantSubscription',entityId:subscription.id,metadata:{status:input.status,planCode:plan.code,superAdminId:session.superAdminId}}});
  revalidatePath('/superadmin'); return {success:true};
}

export async function setTenantFeatureAction(tenantId:string,featureKey:string,enabled:boolean) {
  const session=await requireSuper();
  if(!/^[a-z0-9_.-]{2,80}$/i.test(featureKey)) throw new Error('Feature key inválida.');
  await platformPrisma.tenantFeatureOverride.upsert({where:{tenantId_featureKey:{tenantId,featureKey}},update:{enabled},create:{tenantId,featureKey,enabled}});
  await platformPrisma.auditLog.create({data:{tenantId,actorType:'SUPERADMIN',action:'FEATURE_OVERRIDE_CHANGED',entityType:'TenantFeatureOverride',metadata:{featureKey,enabled,superAdminId:session.superAdminId}}});
  revalidatePath('/superadmin'); return {success:true};
}

export async function startTenantImpersonationAction(tenantId:string) {
  const session=await requireSuper();
  const tenant=await platformPrisma.tenant.findUnique({where:{id:tenantId},include:{domains:true}}); if(!tenant||tenant.status!=='ACTIVE') throw new Error('Tenant no disponible.');
  const user=await platformPrisma.user.findFirst({where:{tenantId,isActive:true,role:'ADMIN'},orderBy:{createdAt:'asc'}}); if(!user) throw new Error('No hay administrador activo.');
  const token=`omi_${randomBytes(32).toString('base64url')}`; const tokenHash=hash(token); const id=randomUUID(); const expiresAt=new Date(Date.now()+5*60*1000);
  await platformPrisma.$executeRaw(Prisma.sql`INSERT INTO ImpersonationGrant (id,tenantId,userId,superAdminId,tokenHash,expiresAt,createdAt) VALUES (${id},${tenantId},${user.id},${session.superAdminId},${tokenHash},${expiresAt},${new Date()})`);
  await platformPrisma.auditLog.create({data:{tenantId,actorType:'SUPERADMIN',action:'IMPERSONATION_GRANTED',entityType:'User',entityId:user.id,metadata:{grantId:id,superAdminId:session.superAdminId,expiresAt:expiresAt.toISOString()}}});
  const domain=tenant.domains.find((x)=>x.isPrimary)?.hostname||tenant.domains[0]?.hostname; if(!domain) throw new Error('Tenant sin dominio.');
  return {success:true,url:`https://${domain}/api/internal/impersonation/consume?token=${encodeURIComponent(token)}`};
}
