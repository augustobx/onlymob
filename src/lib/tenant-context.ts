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
  address?: string | null;
  phone?: string | null;
  cuit?: string | null;
};

const PLATFORM_HOST = (process.env.PLATFORM_HOST || 'onlymob.nanoapps.ar').toLowerCase();
const BASE_DOMAIN = (process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar').toLowerCase();
const cache = new Map<string, { expiresAt: number; value: Promise<TenantContext | null> }>();

export class TenantResolutionError extends Error {
  constructor(message = 'TENANT_NOT_FOUND') {
    super(message);
    this.name = 'TenantResolutionError';
  }
}

export function normalizeHostname(value: string) {
  return value.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

export async function getRequestHostname() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get('x-forwarded-host')?.split(',')[0];
  return normalizeHostname(forwardedHost || headerStore.get('host') || '');
}

async function findTenantRecord(hostname: string) {
  // 1. Check custom domain
  const domain = await platformPrisma.tenantDomain.findUnique({
    where: { hostname },
    include: { tenant: true },
  });

  let tenant = domain?.verifiedAt ? domain.tenant : null;

  // 2. Check subdomain (e.g. taurizano.nanoapps.ar)
  if (!tenant && hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = hostname.slice(0, -(BASE_DOMAIN.length + 1));
    if (slug && !slug.includes('.') && slug !== PLATFORM_HOST.split('.')[0]) {
      tenant = await platformPrisma.tenant.findUnique({ where: { slug } });
    }
  }

  // 3. Fallback for localhost or direct dev: read cookie or return primary/first active tenant
  if (!tenant && (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname === PLATFORM_HOST)) {
    try {
      const cookieStore = await cookies();
      const cookieSlug = cookieStore.get('onlymob_tenant_slug')?.value;
      if (cookieSlug) {
        tenant = await platformPrisma.tenant.findUnique({ where: { slug: cookieSlug } });
      }
    } catch {
      // Cookies not accessible during static generation
    }
    if (!tenant) {
      tenant = await platformPrisma.tenant.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });
    }
  }

  if (!tenant || tenant.status === 'ARCHIVED') return null;
  return tenant;
}

function toContext(tenant: any, hostname: string): TenantContext {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    hostname,
    timezone: tenant.timezone || 'America/Argentina/Buenos_Aires',
    logoUrl: tenant.logoUrl,
    receiptHeader: tenant.receiptHeader,
    address: tenant.address,
    phone: tenant.phone,
    cuit: tenant.cuit,
  };
}

export async function findTenant(hostname: string): Promise<TenantContext | null> {
  const tenant = await findTenantRecord(hostname);
  if (!tenant || tenant.status !== 'ACTIVE') return null;
  return toContext(tenant, hostname);
}

export async function resolveTenantContext(): Promise<TenantContext> {
  const trustedTenantId = process.env.ONLYMOB_TENANT_ID;
  if (trustedTenantId) {
    const tenant = await platformPrisma.tenant.findUnique({ where: { id: trustedTenantId } });
    if (!tenant) throw new TenantResolutionError('TENANT_NOT_FOUND');
    if (tenant.status !== 'ACTIVE') throw new TenantResolutionError('TENANT_SUSPENDED');
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
  cache.set(hostname, { value, expiresAt: Date.now() + 2_000 });
  const tenant = await value;
  if (!tenant) {
    throw new TenantResolutionError('TENANT_NOT_FOUND');
  }
  return tenant;
}

export function clearTenantResolutionCache() {
  cache.clear();
}

export async function isPlatformRequest() {
  const hostname = await getRequestHostname();
  return hostname === PLATFORM_HOST;
}
