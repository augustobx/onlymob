import 'server-only';

import { createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';

const AUTH_SECRET = process.env.AUTH_SECRET || 'nano_auth_secret_key_onlymob_saas_default';
export const ADMIN_COOKIE_NAME = 'onlymob_admin_session';
export const RENTER_COOKIE_NAME = 'onlymob_renter_session';
export const SUPERADMIN_COOKIE_NAME = 'onlymob_superadmin_session';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ==========================================
// CRYPTO HELPERS
// ==========================================
function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken<T>(token: string): T | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expectedSig = createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
    if (sig !== expectedSig) return null;
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (parsed.exp && parsed.exp < Date.now() / 1000) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ==========================================
// ADMIN / STAFF SESSIONS
// ==========================================
export type AdminSession = {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
  exp: number;
};

export async function createAdminSession(user: { id: string; email: string; name: string; role: 'ADMIN' | 'STAFF'; tenantId: string }) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = signToken({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    exp,
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = verifyToken<AdminSession>(token);
  if (!session) return null;

  // Validate user still exists and active in DB
  const user = await platformPrisma.user.findUnique({
    where: { id: session.userId },
    include: { tenant: true },
  });

  if (!user || !user.isActive || user.tenant.status !== 'ACTIVE') {
    return null;
  }

  return session;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

// ==========================================
// RENTER / INQUILINO SESSIONS (PWA)
// ==========================================
export type RenterSession = {
  renterId: string;
  tenantId: string;
  dni: string;
  name: string;
  exp: number;
};

export async function createRenterSession(renter: { id: string; tenantId: string; dni: string; firstName: string; lastName: string }) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS * 4; // 30 days
  const token = signToken({
    renterId: renter.id,
    tenantId: renter.tenantId,
    dni: renter.dni,
    name: `${renter.firstName} ${renter.lastName}`.trim(),
    exp,
  });

  const cookieStore = await cookies();
  cookieStore.set(RENTER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS * 4,
    path: '/',
  });
}

export async function getRenterSession(): Promise<RenterSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(RENTER_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = verifyToken<RenterSession>(token);
  if (!session) return null;

  const renter = await platformPrisma.propertyRenter.findUnique({
    where: { id: session.renterId },
    include: { tenant: true },
  });

  if (!renter || renter.status !== 'ACTIVE' || renter.tenant.status !== 'ACTIVE') {
    return null;
  }

  return session;
}

export async function clearRenterSession() {
  const cookieStore = await cookies();
  cookieStore.delete(RENTER_COOKIE_NAME);
}

// ==========================================
// SUPERADMIN (PLATFORM) SESSIONS
// ==========================================
export type SuperAdminSession = {
  superAdminId: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'SUPPORT';
  exp: number;
};

export async function createSuperAdminSession(admin: { id: string; email: string; name: string; role: 'SUPERADMIN' | 'SUPPORT' }) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = signToken({
    superAdminId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    exp,
  });

  const cookieStore = await cookies();
  cookieStore.set(SUPERADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export async function getSuperAdminSession(): Promise<SuperAdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPERADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = verifyToken<SuperAdminSession>(token);
  if (!session) return null;

  const superadmin = await platformPrisma.superAdminUser.findUnique({
    where: { id: session.superAdminId },
  });

  if (!superadmin) return null;
  return session;
}

export async function clearSuperAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPERADMIN_COOKIE_NAME);
}
