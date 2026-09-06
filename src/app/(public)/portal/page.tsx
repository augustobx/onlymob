import { redirect } from 'next/navigation';
import { Building2, LogOut } from 'lucide-react';
import { getRenterSession } from '@/lib/auth';
import { logoutRenterAction } from '@/actions/auth-actions';
import { getRenterPortalDataAction } from '@/actions/renter-portal';
import { getRenterPortalCommunicationsAction } from '@/actions/communications';
import { RenterPortalClient } from './portal-client';

export const dynamic = 'force-dynamic';

export default async function RenterDashboardPage() {
  const session = await getRenterSession();
  if (!session) redirect('/portal/login');

  const [data, communications] = await Promise.all([
    getRenterPortalDataAction(),
    getRenterPortalCommunicationsAction(),
  ]);

  return (
    <div className="min-h-screen">
      <header className="pwa-topbar">
        <div className="pwa-shell pwa-topbar__inner">
          <div className="pwa-brand">
            <div className="pwa-brand__mark">
              {data.renter.tenant.logoUrl ? (
                <img src={data.renter.tenant.logoUrl} alt="" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="pwa-brand__name">{data.renter.tenant.name}</p>
              <p className="pwa-brand__caption">Mi alquiler · OnlyMob</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-[11px] font-bold text-slate-700">{session.name}</p>
              <p className="text-[9px] text-slate-400">Inquilino</p>
            </div>
            <form action={logoutRenterAction}>
              <button type="submit" title="Cerrar sesión" className="pwa-logout" aria-label="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="pwa-shell pwa-main">
        <RenterPortalClient data={{ ...(data as any), communications }} />
      </main>
    </div>
  );
}
