import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const tenantAdminPrefixes = [
  '/admin',
  '/dashboard',
  '/crm',
  '/agenda',
  '/propiedades',
  '/operaciones',
  '/contactos',
  '/cocheras',
  '/contratos',
  '/mantenimiento',
  '/cobranzas',
  '/administracion',
  '/inquilinos',
  '/recibos',
  '/documentos',
  '/notificaciones',
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

  if (pathname.startsWith('/propietario') && !pathname.startsWith('/propietario/login')) {
    if (!request.cookies.get('onlymob_owner_session')) {
      return NextResponse.redirect(new URL('/propietario/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/crm/:path*',
    '/agenda/:path*',
    '/propiedades/:path*',
    '/operaciones/:path*',
    '/contactos/:path*',
    '/cocheras/:path*',
    '/contratos/:path*',
    '/mantenimiento/:path*',
    '/cobranzas/:path*',
    '/administracion/:path*',
    '/inquilinos/:path*',
    '/recibos/:path*',
    '/documentos/:path*',
    '/notificaciones/:path*',
    '/ajustes/:path*',
    '/superadmin/:path*',
    '/portal/:path*',
    '/propietario/:path*',
  ],
};
