import Link from 'next/link';
import { Building2, LayoutDashboard, Layers3, LogOut, ShieldCheck, UsersRound } from 'lucide-react';
import { getSuperAdminSession } from '@/lib/auth';
import { logoutSuperAdminAction } from '@/actions/auth-actions';

const nav = [
  { href: '/superadmin', label: 'Panel', icon: LayoutDashboard },
  { href: '/superadmin/tenants', label: 'Inmobiliarias', icon: Building2 },
  { href: '/superadmin/planes', label: 'Planes SaaS', icon: Layers3 },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSuperAdminSession();
  if (!session) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:flex">
      <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-800 bg-slate-950/95 lg:sticky lg:top-0 lg:flex lg:flex-col">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-950/40"><ShieldCheck className="h-5 w-5" /></div>
            <div><p className="text-sm font-black text-white">OnlyMob</p><p className="text-[10px] font-bold uppercase tracking-[.15em] text-indigo-400">NanoLabs SuperAdmin</p></div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-900 hover:text-white">
              <Icon className="h-4 w-4 text-indigo-400" />{label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 rounded-xl bg-slate-900 px-3 py-2"><p className="truncate text-xs font-bold text-white">{session.name}</p><p className="truncate text-[10px] text-slate-500">{session.email}</p></div>
          <form action={logoutSuperAdminAction}><button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-400 hover:bg-rose-950/30 hover:text-rose-300"><LogOut className="h-4 w-4" />Cerrar sesión</button></form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/superadmin" className="flex items-center gap-2 font-black text-white"><ShieldCheck className="h-5 w-5 text-indigo-400" />OnlyMob</Link>
            <div className="flex items-center gap-1">
              <Link href="/superadmin" title="Panel" className="rounded-lg p-2 text-slate-400 hover:bg-slate-900"><LayoutDashboard className="h-4 w-4" /></Link>
              <Link href="/superadmin/tenants" title="Inmobiliarias" className="rounded-lg p-2 text-slate-400 hover:bg-slate-900"><UsersRound className="h-4 w-4" /></Link>
              <Link href="/superadmin/planes" title="Planes" className="rounded-lg p-2 text-slate-400 hover:bg-slate-900"><Layers3 className="h-4 w-4" /></Link>
              <form action={logoutSuperAdminAction}><button title="Cerrar sesión" className="rounded-lg p-2 text-slate-400 hover:bg-slate-900"><LogOut className="h-4 w-4" /></button></form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
