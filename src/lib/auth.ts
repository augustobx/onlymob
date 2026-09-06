import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';
import { isTenantFeatureEnabled } from '@/lib/saas';

export const ADMIN_COOKIE_NAME = 'onlymob_admin_session';
export const RENTER_COOKIE_NAME = 'onlymob_renter_session';
export const OWNER_COOKIE_NAME = 'onlymob_owner_session';
export const SUPERADMIN_COOKIE_NAME = 'onlymob_superadmin_session';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET must be configured with at least 32 characters in production.');
  return secret || 'onlymob-development-secret-not-for-production';
}

function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', getAuthSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken<T>(token: string): T | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expectedSig = createHmac('sha256', getAuthSecret()).update(data).digest('base64url');
    const received = Buffer.from(sig);
    const expected = Buffer.from(expectedSig);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (parsed.exp && parsed.exp < Date.now() / 1000) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> { return bcrypt.hash(password, 12); }
export async function verifyPassword(password: string, hash: string): Promise<boolean> { return bcrypt.compare(password, hash); }

export type AdminSession = { userId: string; tenantId: string; email: string; name: string; role: 'ADMIN' | 'STAFF'; exp: number };

export async function createAdminSession(user: { id: string; email: string; name: string; role: 'ADMIN' | 'STAFF'; tenantId: string }) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = signToken({ userId: user.id, tenantId: user.tenantId, email: user.email, name: user.name, role: user.role, exp });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_TTL_SECONDS, path: '/' });
}

export async function getAdminSession(expectedTenantId?: string): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifyToken<AdminSession>(token);
  if (!session) return null;
  if (expectedTenantId && session.tenantId !== expectedTenantId) return null;

  const user = await platformPrisma.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId, isActive: true },
    include: { tenant: true },
  });
  if (!user || user.tenant.status !== 'ACTIVE') return null;
  if (user.email !== session.email || user.role !== session.role) return null;
  return session;
}

export async function clearAdminSession() { (await cookies()).delete(ADMIN_COOKIE_NAME); }

export type RenterSession = { renterId: string; tenantId: string; dni: string; name: string; exp: number };

export async function createRenterSession(renter: { id: string; tenantId: string; dni: string; firstName: string; lastName: string }) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS * 4;
  const token = signToken({ renterId: renter.id, tenantId: renter.tenantId, dni: renter.dni, name: `${renter.firstName} ${renter.lastName}`.trim(), exp });
  const cookieStore = await cookies();
  cookieStore.set(RENTER_COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_TTL_SECONDS * 4, path: '/' });
}

export async function getRenterSession(expectedTenantId?: string): Promise<RenterSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(RENTER_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifyToken<RenterSession>(token);
  if (!session) return null;

  let tenantId = expectedTenantId;
  if (!tenantId) {
    try { tenantId = (await resolveTenantContext()).id; } catch { return null; }
  }
  if (session.tenantId !== tenantId) return null;
  if (!(await isTenantFeatureEnabled(tenantId, 'renter_portal'))) return null;

  const renter = await platformPrisma.propertyRenter.findFirst({
    where: { id: session.renterId, tenantId, status: 'ACTIVE' },
    include: { tenant: true },
  });
  if (!renter || renter.tenant.status !== 'ACTIVE' || renter.dni !== session.dni) return null;
  return session;
}

export async function clearRenterSession() { (await cookies()).delete(RENTER_COOKIE_NAME); }

export type OwnerSession = { ownerContactId: string; tenantId: string; name: string; identifier: string; exp: number };

export async function createOwnerSession(owner: { id: string; tenantId: string; firstName: string; lastName: string; companyName?: string | null; documentNumber?: string | null; cuit?: string | null; email?: string | null }) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS * 4;
  const identifier = owner.documentNumber || owner.cuit || owner.email || owner.id;
  const name = owner.companyName || `${owner.firstName} ${owner.lastName}`.trim();
  const token = signToken({ ownerContactId: owner.id, tenantId: owner.tenantId, name, identifier, exp });
  const cookieStore = await cookies();
  cookieStore.set(OWNER_COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_TTL_SECONDS * 4, path: '/' });
}

export async function getOwnerSession(expectedTenantId?: string): Promise<OwnerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(OWNER_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifyToken<OwnerSession>(token);
  if (!session) return null;

  let tenantId = expectedTenantId;
  if (!tenantId) {
    try { tenantId = (await resolveTenantContext()).id; } catch { return null; }
  }
  if (session.tenantId !== tenantId) return null;
  if (!(await isTenantFeatureEnabled(tenantId, 'owner_portal'))) return null;

  const owner = await platformPrisma.contact.findFirst({
    where: {
      id: session.ownerContactId,
      tenantId,
      isActive: true,
      archivedAt: null,
      ownerPortalEnabled: true,
      roles: { some: { role: 'OWNER' } },
      ownedProperties: { some: { tenantId } },
    },
    include: { tenant: true },
  });
  if (!owner || owner.tenant.status !== 'ACTIVE') return null;
  return session;
}

export async function clearOwnerSession() { (await cookies()).delete(OWNER_COOKIE_NAME); }

export type SuperAdminSession = { superAdminId: string; email: string; name: string; role: 'SUPERADMIN' | 'SUPPORT'; exp: number };

export async function createSuperAdminSession(admin: { id: string; email: string; name: string; role: 'SUPERADMIN' | 'SUPPORT' }) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = signToken({ superAdminId: admin.id, email: admin.email, name: admin.name, role: admin.role, exp });
  const cookieStore = await cookies();
  cookieStore.set(SUPERADMIN_COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_TTL_SECONDS, path: '/' });
}

export async function getSuperAdminSession(): Promise<SuperAdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPERADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifyToken<SuperAdminSession>(token);
  if (!session) return null;
  const superadmin = await platformPrisma.superAdminUser.findUnique({ where: { id: session.superAdminId } });
  if (!superadmin || superadmin.email !== session.email || superadmin.role !== session.role) return null;
  return session;
}

export async function clearSuperAdminSession() { (await cookies()).delete(SUPERADMIN_COOKIE_NAME); }
