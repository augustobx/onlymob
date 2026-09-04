import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const tenantAdminPrefixes = [
  '/admin',
  '/dashboard',
  '/propiedades',
  '/contactos',
  '/cocheras',
  '/contratos',
  '/cobranzas',
  '/inquilinos',
  '/recibos',
  '/ajustes',
];

function normalizeHostname(host: string | null) {
  if (!host) return '';
  return host.split(':')[0].trim().toLowerCase();
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = normalizeHostname(
    request.headers.get('x-forwarded-host') || request.headers.get('host')
  );

  if (tenantAdminPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const adminSession = request.cookies.get('onlymob_admin_session');
    if (!adminSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith('/superadmin') && !pathname.startsWith('/superadmin/login')) {
    if (!request.cookies.get('onlymob_superadmin_session')) {
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }
  }

  if (pathname.startsWith('/portal') && !pathname.startsWith('/portal/login')) {
    if (!request.cookies.get('onlymob_renter_session')) {
      return NextResponse.redirect(new URL('/portal/login', request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (host) requestHeaders.set('x-tenant-host', host);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
