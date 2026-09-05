import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { createAdminSession } from '@/lib/auth';
import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';

export const dynamic = 'force-dynamic';
function hash(value:string){return createHash('sha256').update(value).digest('hex');}

export async function GET(request:NextRequest){
  try{
    const tenant=await resolveTenantContext();
    const token=request.nextUrl.searchParams.get('token')||'';
    if(!token.startsWith('omi_')) return NextResponse.redirect(new URL('/login?error=invalid_support_token',request.url));
    const rows=await platformPrisma.$queryRaw<Array<{id:string;userId:string;superAdminId:string;expiresAt:Date;consumedAt:Date|null}>>(Prisma.sql`SELECT id,userId,superAdminId,expiresAt,consumedAt FROM ImpersonationGrant WHERE tenantId=${tenant.id} AND tokenHash=${hash(token)} LIMIT 1`);
    const grant=rows[0];
    if(!grant||grant.consumedAt||grant.expiresAt<=new Date()) return NextResponse.redirect(new URL('/login?error=expired_support_token',request.url));
    const user=await platformPrisma.user.findFirst({where:{id:grant.userId,tenantId:tenant.id,isActive:true}});
    if(!user) return NextResponse.redirect(new URL('/login?error=support_user_unavailable',request.url));
    await platformPrisma.$transaction(async(tx)=>{
      await tx.$executeRaw(Prisma.sql`UPDATE ImpersonationGrant SET consumedAt=${new Date()} WHERE id=${grant.id} AND consumedAt IS NULL`);
      await tx.auditLog.create({data:{tenantId:tenant.id,actorType:'SUPERADMIN',action:'IMPERSONATION_STARTED',entityType:'User',entityId:user.id,metadata:{grantId:grant.id,superAdminId:grant.superAdminId}}});
    });
    await createAdminSession(user);
    return NextResponse.redirect(new URL('/dashboard',request.url));
  }catch{return NextResponse.redirect(new URL('/login?error=support_access_failed',request.url));}
}
