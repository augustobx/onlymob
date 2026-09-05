import { redirect } from 'next/navigation';
import { Building2, LogOut } from 'lucide-react';
import { getOwnerSession } from '@/lib/auth';
import { getOwnerPortalDataAction, logoutOwnerAction } from '@/actions/owner-portal';
import { OwnerPortalClient } from './owner-portal-client';

export const dynamic = 'force-dynamic';

export default async function OwnerPortalPage() {
  const session = await getOwnerSession();
  if (!session) redirect('/propietario/login');

  const data = await getOwnerPortalDataAction();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl"><Building2 className="w-5 h-5" /></div>
            <div><h1 className="font-bold text-sm leading-tight">{data.owner.tenant.name}</h1><p className="text-[11px] text-slate-400">Portal Propietario</p></div>
          </div>
          <div className="flex items-center gap-3"><span className="hidden sm:inline text-xs font-semibold">{session.name}</span><form action={logoutOwnerAction}><button type="submit" title="Cerrar sesión" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"><LogOut className="w-4 h-4" /></button></form></div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6"><OwnerPortalClient data={data as any} /></main>
    </div>
  );
}
