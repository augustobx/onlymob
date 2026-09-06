'use server';

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { getSuperAdminSession } from '@/lib/auth';
import { getTenantEntitlements, getTenantFeatureFlags, getTenantUsage } from '@/lib/saas';
import { SAAS_FEATURES, isSaasFeatureKey } from '@/lib/feature-catalog';
import { subscriptionStatusAllowsAccess } from '@/lib/saas-policy';
import { clearTenantResolutionCache } from '@/lib/tenant-context';

function hash(value:string) { return createHash('sha256').update(value).digest('hex'); }
async function requireSuper() { const session=await getSuperAdminSession(); if(!session || session.role!=='SUPERADMIN') throw new Error('Acceso no autorizado.'); return session; }

export async function getSaasPlatformAction() {
  const session = await getSuperAdminSession();
  if (!session) throw new Error('Acceso no autorizado.');

  const [tenants, plans, users, properties] = await Promise.all([
    platformPrisma.tenant.findMany({ include: { domains: true, featureOverrides: true }, orderBy: { createdAt: 'desc' } }),
    platformPrisma.plan.findMany({ include: { _count: { select: { subscriptions: true } } }, orderBy: [{ priceMonthly: 'asc' }, { name: 'asc' }] }),
    platformPrisma.user.count({ where: { isActive: true } }),
    platformPrisma.property.count({ where: { archivedAt: null, status: { not: 'ARCHIVADO' } } }),
  ]);

  const details = await Promise.all(tenants.map(async (tenant) => {
    const [entitlement, usage, features] = await Promise.all([
      getTenantEntitlements(tenant.id),
      getTenantUsage(tenant.id),
      getTenantFeatureFlags(tenant.id),
    ]);
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      createdAt: tenant.createdAt.toISOString(),
      domains: tenant.domains.map((domain) => ({ hostname: domain.hostname, isPrimary: domain.isPrimary, verified: Boolean(domain.verifiedAt) })),
      domain: tenant.domains.find((domain) => domain.isPrimary)?.hostname || tenant.domains[0]?.hostname || null,
      entitlement,
      usage,
      features,
    };
  }));

  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const mrr = details.reduce((sum, tenant) => {
    const entitlement = tenant.entitlement;
    if (!entitlement || !['ACTIVE','PAST_DUE'].includes(entitlement.status)) return sum;
    return sum + Number(planById.get(entitlement.planId)?.priceMonthly || 0);
  }, 0);

  return {
    metrics: {
      tenants: tenants.length,
      activeTenants: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,
      suspendedTenants: tenants.filter((tenant) => tenant.status === 'SUSPENDED').length,
      trials: details.filter((tenant) => tenant.entitlement?.status === 'TRIAL').length,
      pastDue: details.filter((tenant) => tenant.entitlement?.status === 'PAST_DUE').length,
      mrr,
      users,
      properties,
    },
    featureCatalog: SAAS_FEATURES,
    plans: plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      priceMonthly: Number(plan.priceMonthly),
      priceYearly: Number(plan.priceYearly),
      maxProperties: plan.maxProperties,
      maxGarages: plan.maxGarages,
      maxUsers: plan.maxUsers,
      maxPublications: plan.maxPublications,
      isActive: plan.isActive,
      subscriptions: plan._count.subscriptions,
    })),
    tenants: details,
  };
}

export async function updateTenantSubscriptionAction(input:{tenantId:string;planId:string;status:'TRIAL'|'ACTIVE'|'PAST_DUE'|'SUSPENDED'|'CANCELED';trialDays?:number}) {
  const session=await requireSuper();
  const [tenant,plan,current]=await Promise.all([
    platformPrisma.tenant.findUnique({where:{id:input.tenantId}}),
    platformPrisma.plan.findUnique({where:{id:input.planId}}),
    platformPrisma.tenantSubscription.findFirst({where:{tenantId:input.tenantId},include:{plan:true},orderBy:{createdAt:'desc'}}),
  ]);
  if(!tenant||!plan) throw new Error('Tenant o plan inexistente.');
  if(!plan.isActive && current?.planId !== plan.id) throw new Error('No se puede asignar un plan inactivo. Reactivalo primero.');

  const now=new Date();
  const end=new Date(now.getTime()+30*86400000);
  const trialEnds=input.status==='TRIAL'?new Date(now.getTime()+Math.max(1,Math.min(input.trialDays||15,90))*86400000):null;
  const subscription=current
    ? await platformPrisma.tenantSubscription.update({where:{id:current.id},data:{planId:plan.id,status:input.status,currentPeriodStart:now,currentPeriodEnd:end,trialEndsAt:trialEnds}})
    : await platformPrisma.tenantSubscription.create({data:{tenantId:tenant.id,planId:plan.id,status:input.status,currentPeriodStart:now,currentPeriodEnd:end,trialEndsAt:trialEnds}});

  await platformPrisma.$executeRaw(Prisma.sql`INSERT INTO SubscriptionEvent (id,tenantId,subscriptionId,actorSuperAdminId,eventType,fromStatus,toStatus,fromPlanCode,toPlanCode,metadata,createdAt) VALUES (${randomUUID()},${tenant.id},${subscription.id},${session.superAdminId},'SUBSCRIPTION_CHANGED',${current?.status||null},${input.status},${current?.plan.code||null},${plan.code},${JSON.stringify({trialEndsAt:trialEnds})},${now})`);
  await platformPrisma.auditLog.create({data:{tenantId:tenant.id,actorType:'SUPERADMIN',action:'SUBSCRIPTION_CHANGED',entityType:'TenantSubscription',entityId:subscription.id,metadata:{status:input.status,planCode:plan.code,superAdminId:session.superAdminId}}});

  clearTenantResolutionCache();
  revalidatePath('/superadmin');
  return {success:true};
}

export async function setTenantFeatureAction(tenantId:string,featureKey:string,enabled:boolean) {
  const session=await requireSuper();
  if(!isSaasFeatureKey(featureKey)) throw new Error('La función solicitada no pertenece al catálogo SaaS de OnlyMob.');
  const tenant=await platformPrisma.tenant.findUnique({where:{id:tenantId},select:{id:true}});
  if(!tenant) throw new Error('Tenant inexistente.');

  await platformPrisma.tenantFeatureOverride.upsert({where:{tenantId_featureKey:{tenantId,featureKey}},update:{enabled},create:{tenantId,featureKey,enabled}});
  await platformPrisma.auditLog.create({data:{tenantId,actorType:'SUPERADMIN',action:'FEATURE_OVERRIDE_CHANGED',entityType:'TenantFeatureOverride',metadata:{featureKey,enabled,superAdminId:session.superAdminId}}});
  revalidatePath('/superadmin');
  return {success:true};
}

export async function savePlanAction(input:{
  id?:string;
  code:string;
  name:string;
  description?:string|null;
  priceMonthly:number;
  priceYearly:number;
  maxProperties:number;
  maxGarages:number;
  maxUsers:number;
  maxPublications:number;
  isActive:boolean;
}) {
  await requireSuper();
  const code=input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'');
  const name=input.name.trim();
  if(code.length<2) throw new Error('El código del plan debe tener al menos 2 caracteres.');
  if(name.length<2) throw new Error('El nombre del plan debe tener al menos 2 caracteres.');
  const priceMonthly=Number(input.priceMonthly);
  const priceYearly=Number(input.priceYearly);
  if(!Number.isFinite(priceMonthly)||priceMonthly<0||!Number.isFinite(priceYearly)||priceYearly<0) throw new Error('Los precios del plan son inválidos.');
  const limits={
    maxProperties:Math.trunc(Number(input.maxProperties)),
    maxGarages:Math.trunc(Number(input.maxGarages)),
    maxUsers:Math.trunc(Number(input.maxUsers)),
    maxPublications:Math.trunc(Number(input.maxPublications)),
  };
  if(limits.maxProperties<0||limits.maxGarages<0||limits.maxPublications<0||limits.maxUsers<1) throw new Error('Los límites del plan son inválidos.');

  if(input.id){
    const existing=await platformPrisma.plan.findUnique({where:{id:input.id}});
    if(!existing) throw new Error('Plan inexistente.');
    await platformPrisma.plan.update({where:{id:input.id},data:{name,description:input.description?.trim()||null,priceMonthly,priceYearly,...limits,isActive:Boolean(input.isActive)}});
  }else{
    const duplicate=await platformPrisma.plan.findUnique({where:{code}});
    if(duplicate) throw new Error('Ya existe un plan con ese código.');
    await platformPrisma.plan.create({data:{code,name,description:input.description?.trim()||null,priceMonthly,priceYearly,...limits,isActive:Boolean(input.isActive)}});
  }
  revalidatePath('/superadmin');
  return {success:true};
}

export async function startTenantImpersonationAction(tenantId:string) {
  const session=await requireSuper();
  const [tenant, entitlement]=await Promise.all([
    platformPrisma.tenant.findUnique({where:{id:tenantId},include:{domains:true}}),
    getTenantEntitlements(tenantId),
  ]);
  if(!tenant||tenant.status!=='ACTIVE') throw new Error('Tenant no disponible.');
  if(entitlement&&!subscriptionStatusAllowsAccess(entitlement.status,entitlement.trialEndsAt)) throw new Error('La suscripción del tenant no permite acceso. Reactivala antes de ingresar como soporte.');

  const user=await platformPrisma.user.findFirst({where:{tenantId,isActive:true,role:'ADMIN'},orderBy:{createdAt:'asc'}});
  if(!user) throw new Error('No hay administrador activo.');
  const token=`omi_${randomBytes(32).toString('base64url')}`;
  const tokenHash=hash(token);
  const id=randomUUID();
  const expiresAt=new Date(Date.now()+5*60*1000);
  await platformPrisma.$executeRaw(Prisma.sql`INSERT INTO ImpersonationGrant (id,tenantId,userId,superAdminId,tokenHash,expiresAt,createdAt) VALUES (${id},${tenantId},${user.id},${session.superAdminId},${tokenHash},${expiresAt},${new Date()})`);
  await platformPrisma.auditLog.create({data:{tenantId,actorType:'SUPERADMIN',action:'IMPERSONATION_GRANTED',entityType:'User',entityId:user.id,metadata:{grantId:id,superAdminId:session.superAdminId,expiresAt:expiresAt.toISOString()}}});
  const domain=tenant.domains.find((domain)=>domain.isPrimary)?.hostname||tenant.domains[0]?.hostname;
  if(!domain) throw new Error('Tenant sin dominio.');
  return {success:true,url:`https://${domain}/api/internal/impersonation/consume?token=${encodeURIComponent(token)}`};
}
