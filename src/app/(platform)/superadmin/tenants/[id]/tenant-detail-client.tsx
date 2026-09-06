'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, CalendarClock, Check, CreditCard, ExternalLink, KeyRound, Save, Shield, ToggleLeft, UsersRound, X } from 'lucide-react';
import { recordSaasPaymentAction, setTenantFeatureOverrideAction, startTenantImpersonationAction, updateSaasTenantAction, updateTenantSubscriptionAction } from '@/actions/saas-admin';
import { formatCurrency, formatDate } from '@/lib/utils';

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-600';
const statuses = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED'] as const;

function dateValue(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
function dayStart(value: string) { return value ? new Date(`${value}T00:00:00`).toISOString() : null; }
function dayEnd(value: string) { return value ? new Date(`${value}T23:59:59`).toISOString() : null; }

export function TenantDetailClient({ tenant, plans, featureCatalog }: { tenant: any; plans: any[]; featureCatalog: readonly any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [profile, setProfile] = useState({ name: tenant.name, cuit: tenant.cuit || '', address: tenant.address || '', phone: tenant.phone || '' });
  const [planId, setPlanId] = useState(tenant.entitlement?.planId || plans[0]?.id || '');
  const [status, setStatus] = useState<(typeof statuses)[number]>((tenant.entitlement?.status || 'ACTIVE') as any);
  const [periodStart, setPeriodStart] = useState(dateValue(tenant.entitlement?.currentPeriodStart));
  const [periodEnd, setPeriodEnd] = useState(dateValue(tenant.entitlement?.currentPeriodEnd));
  const [trialEnd, setTrialEnd] = useState(dateValue(tenant.entitlement?.trialEndsAt));

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === planId) || plans[0], [plans, planId]);
  const inheritedFeature = (key: string) => selectedPlan?.features?.[key] !== false;
  const overrideState = (key: string) => tenant.featureOverrides?.[key] === true ? 'ENABLED' : tenant.featureOverrides?.[key] === false ? 'DISABLED' : 'INHERIT';
  const effectiveFeature = (key: string) => overrideState(key) === 'INHERIT' ? inheritedFeature(key) : overrideState(key) === 'ENABLED';

  function saveGeneral() {
    setMessage('');
    startTransition(async () => {
      try {
        await updateSaasTenantAction({ tenantId: tenant.id, ...profile });
        await updateTenantSubscriptionAction({
          tenantId: tenant.id,
          planId,
          status,
          currentPeriodStart: dayStart(periodStart),
          currentPeriodEnd: dayEnd(periodEnd),
          trialEndsAt: status === 'TRIAL' ? dayEnd(trialEnd || periodEnd) : null,
        });
        setMessage('Configuración guardada.');
        router.refresh();
      } catch (error: any) { setMessage(error?.message || 'No se pudo guardar la configuración.'); }
    });
  }

  function changeFeature(key: string, state: 'INHERIT' | 'ENABLED' | 'DISABLED') {
    setMessage('');
    startTransition(async () => {
      try {
        await setTenantFeatureOverrideAction(tenant.id, key, state);
        setMessage('Módulo actualizado.');
        router.refresh();
      } catch (error: any) { setMessage(error?.message || 'No se pudo actualizar el módulo.'); }
    });
  }

  function support() {
    startTransition(async () => {
      try {
        const result = await startTenantImpersonationAction(tenant.id);
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } catch (error: any) { setMessage(error?.message || 'No se pudo generar acceso de soporte.'); }
    });
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/superadmin/tenants" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Volver a inmobiliarias</Link>
      <div className="flex flex-wrap gap-2"><a href={`https://${tenant.domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-900"><ExternalLink className="h-4 w-4" />Abrir tenant</a><button disabled={pending || tenant.status !== 'ACTIVE'} onClick={support} className="inline-flex items-center gap-2 rounded-xl border border-indigo-800 bg-indigo-950/40 px-3 py-2 text-xs font-bold text-indigo-300 disabled:opacity-40"><KeyRound className="h-4 w-4" />Entrar como soporte</button><button onClick={() => setPaymentOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500"><CreditCard className="h-4 w-4" />Registrar cobro SaaS</button></div>
    </div>

    <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-indigo-950/70 p-6 shadow-2xl">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400"><Building2 className="h-7 w-7" /></div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-black text-white">{tenant.name}</h1><Status value={tenant.status} /><Status value={tenant.entitlement?.status || 'SIN SUSCRIPCIÓN'} /></div><p className="mt-1 font-mono text-xs text-indigo-300">{tenant.domain}</p></div></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Counter label="Propiedades" value={`${tenant.usage.properties}/${tenant.entitlement?.maxProperties ?? '∞'}`} /><Counter label="Cocheras" value={`${tenant.usage.garages}/${tenant.entitlement?.maxGarages ?? '∞'}`} /><Counter label="Usuarios" value={`${tenant.usage.users}/${tenant.entitlement?.maxUsers ?? '∞'}`} /><Counter label="Publicaciones" value={`${tenant.usage.publications}/${tenant.entitlement?.maxPublications ?? '∞'}`} /></div>
      </div>
    </section>

    {message && <div className={`rounded-xl border p-3 text-xs font-semibold ${message.includes('guardada') || message.includes('actualizado') ? 'border-emerald-900 bg-emerald-950/30 text-emerald-300' : 'border-rose-900 bg-rose-950/30 text-rose-300'}`}>{message}</div>}

    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-indigo-300"><Shield className="h-4 w-4" />Estado y membresía</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-xs font-bold text-slate-400">Nombre comercial<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={fieldClass} /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Estado<select value={status} onChange={(e) => setStatus(e.target.value as any)} className={fieldClass}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-bold text-slate-400">Plan<select value={planId} onChange={(e) => setPlanId(e.target.value)} className={fieldClass}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}{plan.isActive ? '' : ' · INACTIVO'}</option>)}</select></label></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Fecha de alta<input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={fieldClass} /></label><label className="text-xs font-bold text-slate-400">Fecha de vencimiento<input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={fieldClass} /></label></div>
            {status === 'TRIAL' && <label className="block text-xs font-bold text-slate-400">Fin de prueba<input type="date" value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} className={fieldClass} /></label>}
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">CUIT<input value={profile.cuit} onChange={(e) => setProfile({ ...profile, cuit: e.target.value })} className={fieldClass} /></label><label className="text-xs font-bold text-slate-400">Teléfono<input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={fieldClass} /></label><div className="sm:col-span-2"><label className="text-xs font-bold text-slate-400">Dirección<input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className={fieldClass} /></label></div></div>
            <button disabled={pending} onClick={saveGeneral} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save className="h-4 w-4" />{pending ? 'Guardando...' : 'Guardar configuración'}</button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4"><h2 className="flex items-center gap-2 text-sm font-black text-white"><ToggleLeft className="h-4 w-4 text-cyan-400" />Módulos y capacidades</h2><p className="mt-1 text-[11px] text-slate-500">El plan define la base. El tenant puede heredar, forzar ON o forzar OFF.</p></div>
          <div className="space-y-3">{featureCatalog.map((feature) => {
            const state = overrideState(feature.key); const effective = effectiveFeature(feature.key);
            return <div key={feature.key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${effective ? 'bg-emerald-400' : 'bg-slate-600'}`} /><strong className="text-sm text-white">{feature.label}</strong><span className="text-[9px] font-black uppercase text-slate-600">{effective ? 'Activo' : 'Inactivo'}</span></div><p className="mt-1 max-w-xl text-[10px] leading-4 text-slate-500">{feature.description}</p></div><select disabled={pending} value={state} onChange={(e) => changeFeature(feature.key, e.target.value as any)} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300"><option value="INHERIT">Heredar del plan ({inheritedFeature(feature.key) ? 'ON' : 'OFF'})</option><option value="ENABLED">Forzar ON</option><option value="DISABLED">Forzar OFF</option></select></div></div>;
          })}</div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="flex items-center gap-2 text-sm font-black text-white"><UsersRound className="h-4 w-4 text-indigo-400" />Usuarios del tenant</h2><div className="mt-4 space-y-2">{tenant.users.map((user: any) => <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div><p className="text-xs font-bold text-white">{user.name}</p><p className="mt-1 text-[10px] text-slate-500">{user.email} · {user.role}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-black ${user.isActive ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>{user.isActive ? 'ACTIVO' : 'INACTIVO'}</span></div>)}</div></section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="flex items-center gap-2 text-sm font-black text-white"><CreditCard className="h-4 w-4 text-emerald-400" />Cobros SaaS</h2><div className="mt-4 space-y-2">{tenant.payments.map((payment: any) => <div key={payment.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="flex items-center justify-between"><strong className="text-sm text-white">{formatCurrency(payment.amount)}</strong><Status value={payment.status} /></div><p className="mt-1 text-[10px] text-slate-500">{formatDate(new Date(payment.paymentDate))}{payment.reference ? ` · ${payment.reference}` : ''}</p>{payment.notes && <p className="mt-1 text-[10px] text-slate-600">{payment.notes}</p>}</div>)}{tenant.payments.length === 0 && <p className="rounded-xl bg-slate-950/60 p-4 text-xs text-slate-500">Sin cobros SaaS registrados.</p>}</div></section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="flex items-center gap-2 text-sm font-black text-white"><CalendarClock className="h-4 w-4 text-cyan-400" />Historial de membresía</h2><div className="mt-4 space-y-2">{tenant.subscriptions.map((sub: any) => <div key={sub.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="flex items-center justify-between gap-2"><strong className="text-xs text-white">{sub.planName}</strong><Status value={sub.status} /></div><p className="mt-1 text-[10px] text-slate-500">{formatDate(new Date(sub.currentPeriodStart))} → {formatDate(new Date(sub.currentPeriodEnd))}</p></div>)}</div></section>
      </div>
    </div>

    {paymentOpen && <PaymentModal tenant={tenant} pending={pending} close={() => setPaymentOpen(false)} submit={(payload) => startTransition(async () => { try { await recordSaasPaymentAction({ tenantId: tenant.id, ...payload }); setPaymentOpen(false); setMessage('Cobro registrado y membresía reactivada.'); router.refresh(); } catch (error: any) { setMessage(error?.message || 'No se pudo registrar el cobro.'); } })} />}
  </div>;
}

function PaymentModal({ tenant, pending, close, submit }: { tenant: any; pending: boolean; close: () => void; submit: (payload: any) => void }) {
  const [amount, setAmount] = useState(tenant.entitlement ? '' : '0'); const [months, setMonths] = useState('1'); const [method, setMethod] = useState('TRANSFERENCIA'); const [reference, setReference] = useState(''); const [notes, setNotes] = useState('');
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"><div className="flex items-center justify-between border-b border-slate-800 p-5"><div><h2 className="text-lg font-black text-white">Registrar cobro SaaS</h2><p className="mt-1 text-xs text-slate-500">El pago reactiva la membresía y extiende el vencimiento.</p></div><button onClick={close} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5"><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-400">Importe<input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={fieldClass} /></label><label className="text-xs font-bold text-slate-400">Meses a renovar<input type="number" min="1" max="24" value={months} onChange={(e) => setMonths(e.target.value)} className={fieldClass} /></label></div><label className="block text-xs font-bold text-slate-400">Medio de pago<select value={method} onChange={(e) => setMethod(e.target.value)} className={fieldClass}><option>TRANSFERENCIA</option><option>EFECTIVO</option><option>MERCADOPAGO</option><option>OTRO</option></select></label><label className="block text-xs font-bold text-slate-400">Referencia<input value={reference} onChange={(e) => setReference(e.target.value)} className={fieldClass} /></label><label className="block text-xs font-bold text-slate-400">Notas<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${fieldClass} resize-none`} /></label><button disabled={pending || Number(amount) <= 0} onClick={() => submit({ amount: Number(amount), months: Number(months), method, reference, notes })} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white disabled:opacity-50"><Check className="h-4 w-4" />{pending ? 'Registrando...' : 'Registrar y renovar'}</button></div></div></div>;
}
function Counter({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-center"><p className="text-[9px] font-black uppercase text-slate-600">{label}</p><strong className="mt-1 block text-sm text-white">{value}</strong></div>; }
function Status({ value }: { value: string }) { const ok = value === 'ACTIVE' || value === 'PAID'; const warn = value === 'TRIAL' || value === 'PAST_DUE' || value === 'PENDING'; return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black ${ok ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : warn ? 'border-amber-800 bg-amber-950/40 text-amber-300' : 'border-rose-900 bg-rose-950/40 text-rose-300'}`}>{value}</span>; }
