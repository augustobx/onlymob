import 'server-only';

import { headers, cookies } from 'next/headers';
import { platformPrisma } from '@/lib/prisma-core';
import { reconcileTenantMembership } from '@/lib/membership';

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
const cache = new Map<string, { expiresAt: number; value: Promise<TenantContext> }>();

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
  return normalizeHostname(headerStore.get('x-forwarded-host') || headerStore.get('host'));
}

async function lookupTenantRecord(hostname: string) {
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

  return tenant;
}

function toContext(tenant: any, hostname: string): TenantContext {
  return { id: tenant.id, slug: tenant.slug, name: tenant.name, hostname, timezone: tenant.timezone || 'America/Argentina/Buenos_Aires', logoUrl: tenant.logoUrl, receiptHeader: tenant.receiptHeader, address: tenant.address ?? null, phone: tenant.phone ?? null, cuit: tenant.cuit ?? null };
}

async function resolveHostnameContext(hostname: string) {
  const tenant = await lookupTenantRecord(hostname);
  if (!tenant || tenant.status === 'ARCHIVED') throw new TenantResolutionError('TENANT_NOT_FOUND');
  const membership = await reconcileTenantMembership(tenant.id);
  if (!membership.allowed) throw new TenantResolutionError('TENANT_SUSPENDED');
  return toContext(tenant, hostname);
}

export async function getTenantRequestAccess() {
  const hostname = await getRequestHostname();
  const tenant = await lookupTenantRecord(hostname);
  if (!tenant || tenant.status === 'ARCHIVED') return { state: 'NOT_FOUND' as const, tenant: null, membership: null };
  const membership = await reconcileTenantMembership(tenant.id);
  return {
    state: membership.allowed ? 'ACTIVE' as const : 'SUSPENDED' as const,
    tenant: toContext(tenant, hostname),
    membership,
  };
}

export async function findTenant(hostname: string): Promise<TenantContext | null> {
  const normalized = normalizeHostname(hostname);
  const tenant = await lookupTenantRecord(normalized);
  if (!tenant || tenant.status === 'ARCHIVED') return null;
  const membership = await reconcileTenantMembership(tenant.id);
  return membership.allowed ? toContext(tenant, normalized) : null;
}

export async function resolveTenantContext(): Promise<TenantContext> {
  const trustedTenantId = process.env.ONLYMOB_TENANT_ID;
  if (trustedTenantId) {
    const tenant = await platformPrisma.tenant.findUnique({ where: { id: trustedTenantId } });
    if (!tenant || tenant.status === 'ARCHIVED') throw new TenantResolutionError('TENANT_NOT_FOUND');
    const membership = await reconcileTenantMembership(tenant.id);
    if (!membership.allowed) throw new TenantResolutionError('TENANT_SUSPENDED');
    return toContext(tenant, `${tenant.slug}.${BASE_DOMAIN}`);
  }

  const hostname = await getRequestHostname();
  const existing = cache.get(hostname);
  if (existing && existing.expiresAt > Date.now()) return existing.value;

  const value = resolveHostnameContext(hostname);
  const entry = { value, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS };
  cache.set(hostname, entry);
  try {
    const tenant = await value;
    entry.expiresAt = Date.now() + POSITIVE_CACHE_TTL_MS;
    return tenant;
  } catch (error) {
    if (error instanceof TenantResolutionError && error.message === 'TENANT_NOT_FOUND') {
      console.error(`[OnlyMob tenant] TENANT_NOT_FOUND host=${hostname || '<empty>'} base=${BASE_DOMAIN} platform=${PLATFORM_HOST}`);
    }
    throw error;
  }
}

export function clearTenantResolutionCache() { cache.clear(); }
export async function isPlatformRequest() { return (await getRequestHostname()) === PLATFORM_HOST; }
