import { NextRequest, NextResponse } from 'next/server';
import { platformPrisma } from '@/lib/prisma-core';
import { normalizeHostname } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  try {
    const domain = normalizeHostname(request.nextUrl.searchParams.get('domain'));
    if (!domain) {
      return new NextResponse('Falta parametro domain', { status: 400 });
    }

    const baseDomain = normalizeHostname(process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar');
    const platformHost = normalizeHostname(process.env.PLATFORM_HOST || `onlymob.${baseDomain}`);

    if (domain === platformHost) {
      return new NextResponse(null, { status: 204 });
    }

    const exactDomain = await platformPrisma.tenantDomain.findUnique({
      where: { hostname: domain },
      include: { tenant: { select: { id: true, status: true } } },
    });

    if (exactDomain?.tenant && exactDomain.tenant.status !== 'ARCHIVED') {
      return new NextResponse(null, { status: 204 });
    }

    if (!domain.endsWith(`.${baseDomain}`)) {
      return new NextResponse('Tenant no encontrado para el dominio', { status: 404 });
    }

    const slug = domain.slice(0, -(baseDomain.length + 1));
    if (!slug || slug.includes('.') || slug === platformHost.split('.')[0]) {
      return new NextResponse('Tenant no encontrado para el dominio', { status: 404 });
    }

    const tenant = await platformPrisma.tenant.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!tenant || tenant.status === 'ARCHIVED') {
      return new NextResponse('Tenant inexistente', { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error en endpoint ask de NanoApps Router:', error);
    return new NextResponse('Error interno', { status: 500 });
  }
}
