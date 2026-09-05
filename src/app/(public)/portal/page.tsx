import { redirect } from 'next/navigation';
import { getRenterSession } from '@/lib/auth';
import { logoutRenterAction } from '@/actions/auth-actions';
import { getRenterPortalDataAction } from '@/actions/renter-portal';
import { RenterPortalClient } from './portal-client';
import { Home, LogOut } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RenterDashboardPage() {
  const session = await getRenterSession();
  if (!session) redirect('/portal/login');

  const data = await getRenterPortalDataAction();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-indigo-600 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-700/80 rounded-xl">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">{data.renter.tenant.name}</h1>
              <p className="text-[11px] text-indigo-200">Portal Inquilino</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-semibold">{session.name}</span>
            <form action={logoutRenterAction}>
              <button type="submit" title="Cerrar sesión" className="p-2 rounded-lg bg-indigo-700/50 hover:bg-indigo-800 text-indigo-100 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <RenterPortalClient data={data as any} />
      </main>
    </div>
  );
}
