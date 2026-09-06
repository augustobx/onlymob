'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BadgeDollarSign,
  Building2,
  Check,
  ExternalLink,
  Globe2,
  KeyRound,
  LogOut,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { createTenantAction, toggleTenantStatusAction } from '@/actions/superadmin';
import { logoutSuperAdminAction } from '@/actions/auth-actions';
import { savePlanAction, setTenantFeatureAction, startTenantImpersonationAction, updateTenantSubscriptionAction } from '@/actions/saas-admin';
import { formatCurrency, formatDate } from '@/lib/utils';

type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';

type PlanDraft = {
  id?: string;
  code: string;
  name: string;
  description: string;
  priceMonthly: number | string;
  priceYearly: number | string;
  maxProperties: number | string;
  maxGarages: number | string;
  maxUsers: number | string;
  maxPublications: number | string;
  isActive: boolean;
};

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED'];

export function SaasPanel({ data, superAdminName }: { data: any; superAdminName: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [newTenantOpen, setNewTenantOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredTenants = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.tenants.filter((tenant: any) => {
      const matchesStatus = statusFilter === 'ALL' || tenant.status === statusFilter || tenant.entitlement?.status === statusFilter;
      const matchesQuery = !needle || [tenant.name, tenant.slug, tenant.domain, tenant.entitlement?.planName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [data.tenants, query, statusFilter]);

  function refreshWithMessage(text: string) {
    setMessage(text);
    router.refresh();
  }

  function changeTenantStatus(tenant: any) {
    const next = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`${next === 'SUSPENDED' ? 'Suspender' : 'Reactivar'} ${tenant.name}?`)) return;
    startTransition(async () => {
      try {
        await toggleTenantStatusAction(tenant.id, next);
        refreshWithMessage(next === 'SUSPENDED' ? 'Tenant suspendido. El acceso queda bloqueado.' : 'Tenant reactivado.');
      } catch (error: any) {
        setMessage(error?.message || 'No se pudo cambiar el estado del tenant.');
      }
    });
  }

  function toggleFeature(tenant: any, featureKey: string) {
    const next = tenant.features?.[featureKey] === false;
    startTransition(async () => {
      try {
        await setTenantFeatureAction(tenant.id, featureKey, next);
        refreshWithMessage(`${featureKey}: ${next ? 'activado' : 'desactivado'} para ${tenant.name}.`);
      } catch (error: any) {
        setMessage(error?.message || 'No se pudo actualizar la función.');
      }
    });
  }

  function saveSubscription(tenant: any) {
    const planId = (document.getElementById(`plan-${tenant.id}`) as HTMLSelectElement | null)?.value;
    const status = (document.getElementById(`subscription-${tenant.id}`) as HTMLSelectElement | null)?.value as SubscriptionStatus | undefined;
    const trialDays = Number((document.getElementById(`trial-${tenant.id}`) as HTMLInputElement | null)?.value || 15);
    if (!planId || !status) return;
    startTransition(async () => {
      try {
        await updateTenantSubscriptionAction({ tenantId: tenant.id, planId, status, trialDays });
        refreshWithMessage(`Suscripción de ${tenant.name} actualizada.`);
      } catch (error: any) {
        setMessage(error?.message || 'No se pudo actualizar la suscripción.');
      }
    });
  }

  function enterSupport(tenant: any) {
    startTransition(async () => {
      try {
        const result = await startTenantImpersonationAction(tenant.id);
        window.open(result.url, '_blank', 'noopener,noreferrer');
        setMessage('Acceso de soporte generado por 5 minutos y auditado.');
      } catch (error: any) {
        setMessage(error?.message || 'No se pudo generar el acceso de soporte.');
      }
    });
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-950/40"><Building2 className="h-6 w-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-300">NanoLabs · Plataforma</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">OnlyMob SaaS Control</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Provisionamiento, planes, límites, suscripciones y funciones de todas las inmobiliarias desde un único panel.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 hidden text-xs font-semibold text-slate-400 md:inline">{superAdminName}</span>
            <button onClick={() => setPlansOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-xs font-black text-slate-200 hover:border-indigo-500/60 hover:text-white"><Settings2 className="h-4 w-4" /> Planes</button>
            <button onClick={() => setNewTenantOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-500"><Plus className="h-4 w-4" /> Nueva inmobiliaria</button>
            <form action={logoutSuperAdminAction}><button type="submit" title="Cerrar sesión" className="rounded-xl border border-slate-700 p-2.5 text-slate-400 hover:bg-slate-800 hover:text-white"><LogOut className="h-4 w-4" /></button></form>
          </div>
        </div>
      </section>

      {message && <div className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-900/60 bg-indigo-950/50 px-4 py-3 text-xs font-semibold text-indigo-200"><span>{message}</span><button onClick={() => setMessage('')} className="text-indigo-400 hover:text-white"><X className="h-4 w-4" /></button></div>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Metric icon={Building2} label="Tenants" value={data.metrics.tenants} />
        <Metric icon={Check} label="Activos" value={data.metrics.activeTenants} />
        <Metric icon={ShieldCheck} label="Suspendidos" value={data.metrics.suspendedTenants} />
        <Metric icon={Activity} label="Trials" value={data.metrics.trials} />
        <Metric icon={BadgeDollarSign} label="Past due" value={data.metrics.pastDue} />
        <Metric icon={BadgeDollarSign} label="MRR" value={formatCurrency(data.metrics.mrr)} />
        <Metric icon={Users} label="Usuarios" value={data.metrics.users} />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-black text-white">Inmobiliarias</h2>
            <p className="mt-1 text-xs text-slate-500">{filteredTenants.length} de {data.tenants.length} tenants visibles</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-[260px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar inmobiliaria, slug o dominio" className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-indigo-600" /></label>
            <label className="relative"><SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-8 text-xs text-slate-200 outline-none focus:border-indigo-600"><option value="ALL">Todos</option><option value="ACTIVE">Tenant activo</option><option value="SUSPENDED">Suspendido</option><option value="TRIAL">Trial</option><option value="PAST_DUE">Past due</option><option value="CANCELED">Cancelado</option></select></label>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {filteredTenants.map((tenant: any) => {
          const entitlement = tenant.entitlement;
          const tenantActive = tenant.status === 'ACTIVE';
          const accessBlocked = !tenantActive || ['SUSPENDED', 'CANCELED'].includes(entitlement?.status || '');
          return (
            <article key={tenant.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-4 border-b border-slate-800 p-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-white">{tenant.name}</h3>
                    <StatusBadge value={tenant.status} kind="tenant" />
                    <StatusBadge value={entitlement?.status || 'SIN SUSCRIPCIÓN'} kind="subscription" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span className="font-mono text-indigo-300">{tenant.slug}</span>
                    {tenant.domain && <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" /> {tenant.domain}</span>}
                    <span>Alta {formatDate(new Date(tenant.createdAt))}</span>
                    {accessBlocked && <strong className="text-rose-400">Acceso bloqueado</strong>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {tenant.domain && <a href={`https://${tenant.domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-800"><ExternalLink className="h-3.5 w-3.5" /> Abrir</a>}
                  <button disabled={isPending || accessBlocked} onClick={() => enterSupport(tenant)} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-900 bg-indigo-950/50 px-3 py-2 text-[11px] font-bold text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"><KeyRound className="h-3.5 w-3.5" /> Soporte</button>
                  <button disabled={isPending} onClick={() => changeTenantStatus(tenant)} className={`rounded-lg px-3 py-2 text-[11px] font-black ${tenantActive ? 'bg-rose-950/50 text-rose-300 ring-1 ring-rose-900' : 'bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-900'}`}>{tenantActive ? 'Suspender tenant' : 'Reactivar tenant'}</button>
                </div>
              </div>

              <div className="grid gap-5 p-5 xl:grid-cols-[1.15fr_1fr]">
                <div className="space-y-5">
                  <div>
                    <div className="mb-3 flex items-center justify-between"><h4 className="text-xs font-black uppercase tracking-[.12em] text-slate-400">Uso del plan</h4><span className="text-xs font-bold text-white">{entitlement?.planName || 'Sin plan'}</span></div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Usage label="Propiedades" value={tenant.usage.properties} limit={entitlement?.maxProperties} />
                      <Usage label="Cocheras" value={tenant.usage.garages} limit={entitlement?.maxGarages} />
                      <Usage label="Usuarios" value={tenant.usage.users} limit={entitlement?.maxUsers} />
                      <Usage label="Publicaciones" value={tenant.usage.publications} limit={entitlement?.maxPublications} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="mb-3"><h4 className="text-xs font-black text-white">Plan y suscripción</h4><p className="mt-1 text-[11px] text-slate-500">Suspended/Canceled bloquean acceso. Past due conserva acceso para gestión de mora.</p></div>
                    <div className="grid gap-2 md:grid-cols-[1fr_150px_100px_auto]">
                      <select id={`plan-${tenant.id}`} defaultValue={entitlement?.planId || data.plans[0]?.id} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-600">
                        {data.plans.map((plan: any) => <option key={plan.id} value={plan.id}>{plan.name}{plan.isActive ? '' : ' · INACTIVO'}</option>)}
                      </select>
                      <select id={`subscription-${tenant.id}`} defaultValue={entitlement?.status || 'ACTIVE'} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-600">{SUBSCRIPTION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                      <input id={`trial-${tenant.id}`} type="number" min="1" max="90" defaultValue="15" title="Días de prueba si el estado es TRIAL" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-600" />
                      <button disabled={isPending || data.plans.length === 0} onClick={() => saveSubscription(tenant)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-500 disabled:opacity-40">Aplicar</button>
                    </div>
                    {entitlement?.currentPeriodEnd && <p className="mt-2 text-[10px] text-slate-600">Período actual hasta {formatDate(new Date(entitlement.currentPeriodEnd))}{entitlement.trialEndsAt ? ` · Trial hasta ${formatDate(new Date(entitlement.trialEndsAt))}` : ''}</p>}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2"><PackageCheck className="h-4 w-4 text-indigo-400" /><h4 className="text-xs font-black uppercase tracking-[.12em] text-slate-400">Funciones del tenant</h4></div>
                  <div className="space-y-2">
                    {data.featureCatalog.map((feature: any) => {
                      const enabled = tenant.features?.[feature.key] !== false;
                      return <button key={feature.key} disabled={isPending} onClick={() => toggleFeature(tenant, feature.key)} className={`flex w-full items-center justify-between gap-4 rounded-xl border p-3 text-left transition ${enabled ? 'border-emerald-900/80 bg-emerald-950/30' : 'border-slate-800 bg-slate-950/60'} disabled:opacity-50`}>
                        <span className="min-w-0"><strong className={`block text-xs ${enabled ? 'text-emerald-200' : 'text-slate-400'}`}>{feature.label}</strong><small className="mt-1 block text-[10px] leading-4 text-slate-600">{feature.description}</small></span>
                        <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${enabled ? 'left-6' : 'left-1'}`} /></span>
                      </button>;
                    })}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {filteredTenants.length === 0 && <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-sm text-slate-500">No hay tenants que coincidan con el filtro.</div>}
      </section>

      {newTenantOpen && <NewTenantModal plans={data.plans.filter((plan:any)=>plan.isActive)} onClose={() => setNewTenantOpen(false)} onSaved={() => { setNewTenantOpen(false); refreshWithMessage('Nueva inmobiliaria provisionada correctamente.'); }} />}
      {plansOpen && <PlansModal plans={data.plans} onClose={() => setPlansOpen(false)} onSaved={() => { refreshWithMessage('Plan guardado.'); }} />}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-3.5 w-3.5" /><span className="text-[9px] font-black uppercase tracking-[.12em]">{label}</span></div><strong className="mt-2 block truncate text-lg font-black text-white">{value}</strong></div>;
}

function Usage({ label, value, limit }: { label: string; value: number; limit?: number }) {
  const safeLimit = typeof limit === 'number' ? limit : null;
  const percent = safeLimit && safeLimit > 0 ? Math.min(100, Math.round((value / safeLimit) * 100)) : value > 0 && safeLimit === 0 ? 100 : 0;
  const atLimit = safeLimit !== null && value >= safeLimit;
  return <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><span className="text-[9px] font-bold uppercase text-slate-600">{label}</span><div className="mt-1 flex items-end justify-between gap-2"><b className={`text-sm ${atLimit ? 'text-amber-300' : 'text-white'}`}>{value}</b><small className="text-[9px] text-slate-600">/ {safeLimit ?? '∞'}</small></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${atLimit ? 'bg-amber-400' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }} /></div></div>;
}

function StatusBadge({ value, kind }: { value: string; kind: 'tenant' | 'subscription' }) {
  const positive = value === 'ACTIVE';
  const warning = value === 'TRIAL' || value === 'PAST_DUE';
  const className = positive ? 'bg-emerald-950 text-emerald-300 ring-emerald-900' : warning ? 'bg-amber-950 text-amber-300 ring-amber-900' : 'bg-rose-950 text-rose-300 ring-rose-900';
  return <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ring-1 ${className}`}>{kind === 'tenant' ? `Tenant ${value}` : value}</span>;
}

function NewTenantModal({ plans, onClose, onSaved }: { plans: any[]; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const planId = String(form.get('planId') || '');
      const plan = plans.find((item) => item.id === planId);
      if (!plan) throw new Error('Seleccioná un plan activo.');
      await createTenantAction({
        name: String(form.get('name') || ''),
        slug: String(form.get('slug') || ''),
        adminName: String(form.get('adminName') || ''),
        adminEmail: String(form.get('adminEmail') || ''),
        adminPassword: String(form.get('adminPassword') || ''),
        planCode: plan.code,
      });
      onSaved();
    } catch (error: any) {
      setError(error?.message || 'No se pudo provisionar la inmobiliaria.');
    } finally {
      setSaving(false);
    }
  }

  return <Modal title="Nueva inmobiliaria" subtitle="Crea tenant, subdominio, roles, administrador y suscripción en una única transacción." onClose={onClose} maxWidth="max-w-2xl">
    {error && <ErrorBox text={error} />}
    <form onSubmit={submit} className="space-y-4">
      <Field name="name" label="Nombre comercial" placeholder="Inmobiliaria Delta" required />
      <div className="grid gap-3 sm:grid-cols-2"><Field name="slug" label="Slug / subdominio" placeholder="delta" required /><label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Plan</span><select name="planId" required defaultValue={plans[0]?.id || ''} className={fieldClass}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {formatCurrency(plan.priceMonthly)}/mes</option>)}</select></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field name="adminName" label="Administrador" placeholder="Juan Pérez" required /><Field name="adminEmail" label="Email administrador" type="email" placeholder="juan@delta.com" required /></div>
      <Field name="adminPassword" label="Clave inicial" type="password" placeholder="Mínimo 12 caracteres" required minLength={12} />
      <div className="flex justify-end gap-2 border-t border-slate-800 pt-4"><button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300">Cancelar</button><button disabled={saving || plans.length === 0} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? 'Provisionando...' : 'Crear inmobiliaria'}</button></div>
    </form>
  </Modal>;
}

function PlansModal({ plans, onClose, onSaved }: { plans: any[]; onClose: () => void; onSaved: () => void }) {
  const [selectedId, setSelectedId] = useState(plans[0]?.id || '');
  const selected = plans.find((plan) => plan.id === selectedId) || null;
  const [draft, setDraft] = useState<PlanDraft>(() => selected ? planToDraft(selected) : emptyPlan());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function choose(plan: any) {
    setSelectedId(plan.id);
    setDraft(planToDraft(plan));
    setError('');
  }

  function createNew() {
    setSelectedId('');
    setDraft(emptyPlan());
    setError('');
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await savePlanAction({
        id: draft.id,
        code: draft.code,
        name: draft.name,
        description: draft.description,
        priceMonthly: Number(draft.priceMonthly),
        priceYearly: Number(draft.priceYearly),
        maxProperties: Number(draft.maxProperties),
        maxGarages: Number(draft.maxGarages),
        maxUsers: Number(draft.maxUsers),
        maxPublications: Number(draft.maxPublications),
        isActive: draft.isActive,
      });
      onSaved();
    } catch (error: any) {
      setError(error?.message || 'No se pudo guardar el plan.');
    } finally {
      setSaving(false);
    }
  }

  return <Modal title="Planes SaaS" subtitle="Administrá precios, capacidad y disponibilidad. Desactivar un plan impide nuevas asignaciones, pero no corta tenants que ya lo usan." onClose={onClose} maxWidth="max-w-5xl">
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <div className="space-y-2">
        <button onClick={createNew} className="w-full rounded-xl border border-dashed border-indigo-700 bg-indigo-950/30 p-3 text-xs font-black text-indigo-300 hover:bg-indigo-950/60">+ Nuevo plan</button>
        {plans.map((plan) => <button key={plan.id} onClick={() => choose(plan)} className={`w-full rounded-xl border p-3 text-left ${draft.id === plan.id ? 'border-indigo-600 bg-indigo-950/40' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}><div className="flex items-center justify-between gap-2"><strong className="text-xs text-white">{plan.name}</strong><span className={`h-2 w-2 rounded-full ${plan.isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} /></div><p className="mt-1 font-mono text-[10px] text-indigo-400">{plan.code}</p><p className="mt-2 text-[10px] text-slate-600">{plan.subscriptions} suscripciones</p></button>)}
      </div>
      <div className="space-y-4">
        {error && <ErrorBox text={error} />}
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold text-slate-400">Código</span><input value={draft.code} disabled={Boolean(draft.id)} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} className={`${fieldClass} disabled:opacity-50`} /></label><label><span className="mb-1 block text-xs font-bold text-slate-400">Nombre</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={fieldClass} /></label></div>
        <label><span className="mb-1 block text-xs font-bold text-slate-400">Descripción</span><textarea rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={fieldClass} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><NumberField label="Precio mensual" value={draft.priceMonthly} onChange={(value) => setDraft({ ...draft, priceMonthly: value })} /><NumberField label="Precio anual" value={draft.priceYearly} onChange={(value) => setDraft({ ...draft, priceYearly: value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><NumberField label="Propiedades" value={draft.maxProperties} onChange={(value) => setDraft({ ...draft, maxProperties: value })} /><NumberField label="Cocheras" value={draft.maxGarages} onChange={(value) => setDraft({ ...draft, maxGarages: value })} /><NumberField label="Usuarios" min={1} value={draft.maxUsers} onChange={(value) => setDraft({ ...draft, maxUsers: value })} /><NumberField label="Publicaciones" value={draft.maxPublications} onChange={(value) => setDraft({ ...draft, maxPublications: value })} /></div>
        <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"><span><strong className="block text-xs text-white">Plan disponible</strong><small className="text-[10px] text-slate-600">Si está OFF no podrá asignarse a nuevos tenants.</small></span><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} className="h-4 w-4 accent-indigo-500" /></label>
        <div className="flex justify-end border-t border-slate-800 pt-4"><button disabled={saving} onClick={save} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? 'Guardando...' : draft.id ? 'Guardar plan' : 'Crear plan'}</button></div>
      </div>
    </div>
  </Modal>;
}

const fieldClass = 'w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-600';

function Modal({ title, subtitle, onClose, maxWidth, children }: { title: string; subtitle: string; onClose: () => void; maxWidth: string; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"><div className={`my-auto max-h-[94vh] w-full overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl ${maxWidth}`}><div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/95 p-5 backdrop-blur"><div><h2 className="text-xl font-black text-white">{title}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{subtitle}</p></div><button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div></div></div>;
}

function Field({ name, label, type = 'text', placeholder, required, minLength }: { name: string; label: string; type?: string; placeholder?: string; required?: boolean; minLength?: number }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">{label}</span><input name={name} type={type} placeholder={placeholder} required={required} minLength={minLength} className={fieldClass} /></label>;
}

function NumberField({ label, value, onChange, min = 0 }: { label: string; value: number | string; onChange: (value: string) => void; min?: number }) {
  return <label><span className="mb-1 block text-xs font-bold text-slate-400">{label}</span><input type="number" min={min} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} /></label>;
}

function ErrorBox({ text }: { text: string }) {
  return <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-xs font-semibold text-rose-300">{text}</div>;
}

function planToDraft(plan: any): PlanDraft {
  return { id: plan.id, code: plan.code, name: plan.name, description: plan.description || '', priceMonthly: plan.priceMonthly, priceYearly: plan.priceYearly, maxProperties: plan.maxProperties, maxGarages: plan.maxGarages, maxUsers: plan.maxUsers, maxPublications: plan.maxPublications, isActive: plan.isActive };
}

function emptyPlan(): PlanDraft {
  return { code: '', name: '', description: '', priceMonthly: 0, priceYearly: 0, maxProperties: 50, maxGarages: 10, maxUsers: 5, maxPublications: 50, isActive: true };
}
