import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, ArrowRight, BadgeDollarSign, Building2, CalendarClock, CheckCircle2, Layers3, Plus, ShieldAlert, UsersRound } from 'lucide-react';
import { getSuperAdminSession } from '@/lib/auth';
import { getSaasPlatformAction } from '@/actions/saas-admin';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect('/superadmin/login');
  const data = await getSaasPlatformAction();
  const recent = data.tenants.slice(0, 8);

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-300">NanoLabs · Plano de Control</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">OnlyMob SuperAdmin</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Estado comercial y operativo de la plataforma. Tenants, membresías, vencimientos, planes y capacidad desde el mismo estándar de OnlyERP.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/superadmin/planes" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-2.5 text-xs font-black text-slate-200 hover:border-indigo-500"><Layers3 className="h-4 w-4" />Planes</Link>
            <Link href="/superadmin/tenants" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-500"><Plus className="h-4 w-4" />Nueva inmobiliaria</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Metric icon={Building2} label="Tenants" value={data.metrics.tenants} />
        <Metric icon={CheckCircle2} label="Activos" value={data.metrics.activeTenants} accent="text-emerald-400" />
        <Metric icon={Activity} label="En prueba" value={data.metrics.trials} accent="text-amber-400" />
        <Metric icon={ShieldAlert} label="Suspendidos" value={data.metrics.suspendedTenants} accent="text-rose-400" />
        <Metric icon={CalendarClock} label="Vencen ≤15d" value={data.metrics.expiringSoon} accent="text-cyan-400" />
        <Metric icon={BadgeDollarSign} label="MRR" value={formatCurrency(data.metrics.mrr)} accent="text-emerald-400" />
        <Metric icon={UsersRound} label="Usuarios" value={data.metrics.users} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_.75fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div><h2 className="font-black text-white">Últimas inmobiliarias</h2><p className="mt-1 text-xs text-slate-500">Estado, plan y vencimiento de membresía.</p></div>
            <Link href="/superadmin/tenants" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-300 hover:text-indigo-200">Ver todas <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-950/70 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Inmobiliaria</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Membresía</th><th className="px-4 py-3">Vence</th><th className="px-4 py-3 text-right">Estado</th></tr></thead>
              <tbody className="divide-y divide-slate-800/70">
                {recent.map((tenant: any) => <tr key={tenant.id} className="hover:bg-slate-800/30">
                  <td className="px-5 py-4"><Link href={`/superadmin/tenants/${tenant.id}`} className="font-bold text-white hover:text-indigo-300">{tenant.name}</Link><p className="mt-1 font-mono text-[10px] text-indigo-400">{tenant.domain}</p></td>
                  <td className="px-4 py-4 text-xs text-slate-300">{tenant.entitlement?.planName || 'Sin plan'}</td>
                  <td className="px-4 py-4"><Status value={tenant.entitlement?.status || 'SIN SUSCRIPCIÓN'} /></td>
                  <td className="px-4 py-4 text-xs text-slate-400">{tenant.entitlement?.currentPeriodEnd ? formatDate(new Date(tenant.entitlement.currentPeriodEnd)) : '—'}</td>
                  <td className="px-4 py-4 text-right"><Status value={tenant.status} /></td>
                </tr>)}
                {recent.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">Todavía no hay tenants provisionados.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-black text-white">Planes SaaS</h2><p className="mt-1 text-xs text-slate-500">Oferta comercial vigente.</p></div><Layers3 className="h-5 w-5 text-emerald-400" /></div>
          <div className="space-y-3">
            {data.plans.map((plan: any) => <Link href="/superadmin/planes" key={plan.id} className="block rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-700">
              <div className="flex items-center justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">{plan.code}</span><p className="mt-1 text-sm font-bold text-white">{plan.name}</p></div><strong className="text-sm text-white">{formatCurrency(plan.priceMonthly)}</strong></div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500"><span>{plan.subscriptions} suscripciones</span><span>{plan.isActive ? 'Disponible' : 'Inactivo'}</span></div>
            </Link>)}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent = 'text-indigo-400' }: { icon: any; label: string; value: string | number; accent?: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><Icon className={`h-4 w-4 ${accent}`} /><p className="mt-4 text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p><strong className="mt-1 block text-lg font-black text-white">{value}</strong></div>;
}
function Status({ value }: { value: string }) {
  const ok = value === 'ACTIVE';
  const warning = value === 'TRIAL' || value === 'PAST_DUE';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${ok ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : warning ? 'border-amber-800 bg-amber-950/40 text-amber-300' : 'border-rose-900 bg-rose-950/40 text-rose-300'}`}>{value}</span>;
}
