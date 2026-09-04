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

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/propiedades/:path*',
    '/contactos/:path*',
    '/cocheras/:path*',
    '/contratos/:path*',
    '/cobranzas/:path*',
    '/inquilinos/:path*',
    '/recibos/:path*',
    '/ajustes/:path*',
    '/superadmin/:path*',
    '/portal/:path*',
  ],
};
