import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Proteger panel de inmobiliaria (/admin /dashboard etc)
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/propiedades') || pathname.startsWith('/cocheras') || pathname.startsWith('/contratos') || pathname.startsWith('/cobranzas') || pathname.startsWith('/inquilinos') || pathname.startsWith('/recibos') || pathname.startsWith('/ajustes')) {
    const adminSession = request.cookies.get('onlymob_admin_session');
    if (!adminSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Proteger plano SuperAdmin (/superadmin)
  if (pathname.startsWith('/superadmin') && !pathname.startsWith('/superadmin/login')) {
    const superSession = request.cookies.get('onlymob_superadmin_session');
    if (!superSession) {
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }
  }

  // 3. Proteger portal de inquilinos (/portal)
  if (pathname.startsWith('/portal') && !pathname.startsWith('/portal/login')) {
    const renterSession = request.cookies.get('onlymob_renter_session');
    if (!renterSession) {
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
