import { redirect } from 'next/navigation';
import { Building2, LogOut } from 'lucide-react';
import { getOwnerSession } from '@/lib/auth';
import { getOwnerPortalDataAction, logoutOwnerAction } from '@/actions/owner-portal';
import { getOwnerPortalCommunicationsAction } from '@/actions/communications';
import { PortalCommunications } from '@/components/portal/portal-communications';
import { OwnerPortalClient } from './owner-portal-client';

export const dynamic = 'force-dynamic';

export default async function OwnerPortalPage() {
  const session = await getOwnerSession();
  if (!session) redirect('/propietario/login');

  const [data, communications] = await Promise.all([
    getOwnerPortalDataAction(),
    getOwnerPortalCommunicationsAction(),
  ]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="portal-topbar portal-topbar--owner sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="portal-brandmark"><Building2 className="w-5 h-5" /></div>
            <div><h1 className="font-bold text-sm leading-tight">{data.owner.tenant.name}</h1><p className="text-[11px] opacity-70">Portal Propietario</p></div>
          </div>
          <div className="flex items-center gap-3"><span className="hidden sm:inline text-xs font-semibold">{session.name}</span><form action={logoutOwnerAction}><button type="submit" title="Cerrar sesión" className="portal-icon-button"><LogOut className="w-4 h-4" /></button></form></div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        <OwnerPortalClient data={{ ...(data as any), communications }} />
        <PortalCommunications messages={communications as any[]} audience="OWNER" />
      </main>
    </div>
  );
}
