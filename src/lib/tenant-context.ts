import 'server-only';

import { headers, cookies } from 'next/headers';
import { platformPrisma } from '@/lib/prisma-core';

export type TenantContext = {
  id: string;
  slug: string;
  name: string;
  hostname: string;
  timezone: string;
  logoUrl?: string | null;
  receiptHeader?: string | null;
  address: string | null;
  phone: string | null;
  cuit: string | null;
};

const PLATFORM_HOST = normalizeHostname(process.env.PLATFORM_HOST || 'onlymob.nanoapps.ar');
const BASE_DOMAIN = normalizeHostname(process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar');
const POSITIVE_CACHE_TTL_MS = 30_000;
const NEGATIVE_CACHE_TTL_MS = 2_000;
const cache = new Map<string, { expiresAt: number; value: Promise<TenantContext | null> }>();

export class TenantResolutionError extends Error {
  constructor(message = 'TENANT_NOT_FOUND') { super(message); this.name = 'TenantResolutionError'; }
}

export function normalizeHostname(value: string | null | undefined) {
  if (!value) return '';
  const raw = value.trim().toLowerCase();
  if (!raw || raw.includes(',')) return '';
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\.$/, '').replace(/:\d+$/, '');
}

export async function getRequestHostname() {
  const headerStore = await headers();
  return normalizeHostname(headerStore.get('host'));
}

async function subscriptionAllowsAccess(tenantId: string) {
  const subscription = await platformPrisma.tenantSubscription.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { status: true, trialEndsAt: true } });
  if (!subscription) return true;
  if (subscription.status === 'SUSPENDED' || subscription.status === 'CANCELED') return false;
  if (subscription.status === 'TRIAL' && subscription.trialEndsAt && subscription.trialEndsAt < new Date()) return false;
  return true;
}

async function findTenantRecord(hostname: string) {
  const domain = await platformPrisma.tenantDomain.findUnique({ where: { hostname }, include: { tenant: true } });
  let tenant = domain?.verifiedAt ? domain.tenant : null;

  if (!tenant && hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = hostname.slice(0, -(BASE_DOMAIN.length + 1));
    if (slug && !slug.includes('.') && slug !== PLATFORM_HOST.split('.')[0]) tenant = await platformPrisma.tenant.findUnique({ where: { slug } });
  }

  if (!tenant && (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname === PLATFORM_HOST)) {
    try {
      const cookieStore = await cookies();
      const cookieSlug = cookieStore.get('onlymob_tenant_slug')?.value;
      if (cookieSlug) tenant = await platformPrisma.tenant.findUnique({ where: { slug: cookieSlug } });
    } catch {}
    if (!tenant) tenant = await platformPrisma.tenant.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
  }

  if (!tenant || tenant.status !== 'ACTIVE' || !(await subscriptionAllowsAccess(tenant.id))) return null;
  return tenant;
}

function toContext(tenant: any, hostname: string): TenantContext {
  return { id: tenant.id, slug: tenant.slug, name: tenant.name, hostname, timezone: tenant.timezone || 'America/Argentina/Buenos_Aires', logoUrl: tenant.logoUrl, receiptHeader: tenant.receiptHeader, address: tenant.address ?? null, phone: tenant.phone ?? null, cuit: tenant.cuit ?? null };
}

export async function findTenant(hostname: string): Promise<TenantContext | null> {
  const tenant = await findTenantRecord(hostname);
  return tenant ? toContext(tenant, hostname) : null;
}

export async function resolveTenantContext(): Promise<TenantContext> {
  const trustedTenantId = process.env.ONLYMOB_TENANT_ID;
  if (trustedTenantId) {
    const tenant = await platformPrisma.tenant.findUnique({ where: { id: trustedTenantId } });
    if (!tenant) throw new TenantResolutionError('TENANT_NOT_FOUND');
    if (tenant.status !== 'ACTIVE' || !(await subscriptionAllowsAccess(tenant.id))) throw new TenantResolutionError('TENANT_SUSPENDED');
    return toContext(tenant, `${tenant.slug}.${BASE_DOMAIN}`);
  }

  const hostname = await getRequestHostname();
  const existing = cache.get(hostname);
  if (existing && existing.expiresAt > Date.now()) {
    const value = await existing.value;
    if (value) return value;
    throw new TenantResolutionError('TENANT_NOT_FOUND');
  }

  const value = findTenant(hostname);
  const entry = { value, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS };
  cache.set(hostname, entry);
  const tenant = await value;
  if (!tenant) {
    console.error(`[OnlyMob tenant] TENANT_NOT_FOUND host=${hostname || '<empty>'} base=${BASE_DOMAIN} platform=${PLATFORM_HOST}`);
    throw new TenantResolutionError('TENANT_NOT_FOUND');
  }
  entry.expiresAt = Date.now() + POSITIVE_CACHE_TTL_MS;
  return tenant;
}

export function clearTenantResolutionCache() { cache.clear(); }
export async function isPlatformRequest() { return (await getRequestHostname()) === PLATFORM_HOST; }
