'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CalendarClock, ChevronRight, Globe2, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { createTenantAction } from '@/actions/superadmin';
import { formatDate } from '@/lib/utils';

function dateInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function TenantsClient({ tenants, plans }: { tenants: any[]; plans: any[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const statusOk = status === 'ALL' || tenant.status === status || tenant.entitlement?.status === status;
      const queryOk = !needle || [tenant.name, tenant.slug, tenant.domain, tenant.entitlement?.planName].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
      return statusOk && queryOk;
    });
  }, [tenants, query, status]);

  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    startTransition(async () => {
      try {
        const result = await createTenantAction({
          name: String(form.get('name') || ''),
          slug: String(form.get('slug') || ''),
          planId: String(form.get('planId') || ''),
          subscriptionStatus: String(form.get('subscriptionStatus') || 'ACTIVE') as any,
          currentPeriodStart: String(form.get('currentPeriodStart') || ''),
          currentPeriodEnd: String(form.get('currentPeriodEnd') || ''),
          cuit: String(form.get('cuit') || ''),
          address: String(form.get('address') || ''),
          phone: String(form.get('phone') || ''),
          adminName: String(form.get('adminName') || ''),
          adminEmail: String(form.get('adminEmail') || ''),
          adminPassword: String(form.get('adminPassword') || ''),
        });
        setOpen(false);
        router.push(`/superadmin/tenants/${result.tenantId}`);
        router.refresh();
      } catch (err: any) {
        setError(err?.message || 'No se pudo provisionar la inmobiliaria.');
      }
    });
  }

  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-400">Plano de Control</p><h1 className="mt-1 text-2xl font-black text-white">Inmobiliarias & Tenants</h1><p className="mt-1 text-sm text-slate-400">Alta, membresía, vencimientos, plan y estado operativo de cada cliente SaaS.</p></div>
        <button onClick={() => { setError(''); setOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-500"><Plus className="h-4 w-4" />Nueva inmobiliaria</button>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, slug, dominio o plan" className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-indigo-600" /></label>
          <label className="relative"><SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-8 text-xs text-slate-200"><option value="ALL">Todos</option><option value="ACTIVE">Activos</option><option value="TRIAL">En prueba</option><option value="PAST_DUE">En mora</option><option value="SUSPENDED">Suspendidos</option><option value="CANCELED">Cancelados</option></select></label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left">
            <thead className="bg-slate-950/70 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Inmobiliaria</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Capacidad</th><th className="px-4 py-3">Membresía</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-slate-800/70">
              {filtered.map((tenant) => <tr key={tenant.id} className="hover:bg-slate-800/30">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"><Building2 className="h-4 w-4" /></div><div><Link href={`/superadmin/tenants/${tenant.id}`} className="text-sm font-black text-white hover:text-indigo-300">{tenant.name}</Link><p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-indigo-400"><Globe2 className="h-3 w-3" />{tenant.domain}</p></div></div></td>
                <td className="px-4 py-4"><p className="text-xs font-bold text-slate-200">{tenant.entitlement?.planName || 'Sin plan'}</p><p className="mt-1 text-[10px] text-slate-500">{tenant.entitlement?.status || 'SIN SUSCRIPCIÓN'}</p></td>
                <td className="px-4 py-4 text-[11px] text-slate-400"><p>{tenant.usage.properties}/{tenant.entitlement?.maxProperties ?? '∞'} propiedades</p><p className="mt-1">{tenant.usage.users}/{tenant.entitlement?.maxUsers ?? '∞'} usuarios</p></td>
                <td className="px-4 py-4 text-[11px] text-slate-400"><p className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5 text-cyan-400" />{tenant.entitlement?.currentPeriodEnd ? formatDate(new Date(tenant.entitlement.currentPeriodEnd)) : 'Sin vencimiento'}</p><p className="mt-1 text-slate-600">Alta {formatDate(new Date(tenant.createdAt))}</p></td>
                <td className="px-4 py-4"><StatusBadge value={tenant.status} /></td>
                <td className="px-4 py-4 text-right"><Link href={`/superadmin/tenants/${tenant.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-800">Administrar <ChevronRight className="h-3.5 w-3.5" /></Link></td>
              </tr>)}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No hay tenants que coincidan con el filtro.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 p-5"><div><h2 className="text-lg font-black text-white">Provisionar inmobiliaria</h2><p className="mt-1 text-xs text-slate-400">Tenant, dominio, administrador, plan y membresía en una única operación.</p></div><button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
          <form onSubmit={create} className="space-y-6 p-5">
            {error && <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-xs font-semibold text-rose-300">{error}</div>}
            <div className="grid gap-4 sm:grid-cols-2"><Field name="name" label="Nombre comercial *" required /><Field name="slug" label="Slug / subdominio *" placeholder="taurizano" required /></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Plan SaaS *<select name="planId" required className="field mt-1">{plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label className="text-xs font-bold text-slate-400">Estado inicial<select name="subscriptionStatus" defaultValue="ACTIVE" className="field mt-1"><option value="ACTIVE">Activo</option><option value="TRIAL">Prueba</option></select></label></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field name="currentPeriodStart" label="Fecha de alta *" type="date" defaultValue={dateInput(start)} required /><Field name="currentPeriodEnd" label="Fecha de vencimiento *" type="date" defaultValue={dateInput(end)} required /></div>
            <div className="border-t border-slate-800 pt-5"><h3 className="mb-3 text-xs font-black uppercase tracking-wider text-indigo-400">Datos del cliente</h3><div className="grid gap-4 sm:grid-cols-2"><Field name="cuit" label="CUIT" /><Field name="phone" label="Teléfono" /><div className="sm:col-span-2"><Field name="address" label="Dirección" /></div></div></div>
            <div className="border-t border-slate-800 pt-5"><h3 className="mb-3 text-xs font-black uppercase tracking-wider text-indigo-400">Administrador inicial</h3><div className="grid gap-4 sm:grid-cols-2"><Field name="adminName" label="Nombre *" required /><Field name="adminEmail" label="Email *" type="email" required /><div className="sm:col-span-2"><Field name="adminPassword" label="Clave inicial *" type="password" minLength={12} required /></div></div></div>
            <p className="rounded-xl border border-indigo-900/60 bg-indigo-950/30 p-3 text-[11px] text-indigo-200">El dominio se crea automáticamente como <strong>slug.nanoapps.ar</strong>. No se crea un Proxy Host individual.</p>
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300">Cancelar</button><button disabled={pending || plans.length === 0} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{pending ? 'Provisionando...' : 'Crear inmobiliaria'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}

function Field(props: { name: string; label: string; type?: string; placeholder?: string; required?: boolean; minLength?: number; defaultValue?: string }) {
  return <label className="block text-xs font-bold text-slate-400">{props.label}<input {...props} aria-label={props.label} className="field mt-1" /></label>;
}
function StatusBadge({ value }: { value: string }) {
  const active = value === 'ACTIVE';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${active ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-rose-900 bg-rose-950/40 text-rose-300'}`}>{active ? 'Activo' : value === 'SUSPENDED' ? 'Suspendido' : value}</span>;
}
