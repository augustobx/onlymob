'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, Layers3, Plus, Save, UsersRound } from 'lucide-react';
import { savePlanAction } from '@/actions/saas-admin';
import { formatCurrency } from '@/lib/utils';

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-600';

export function PlansClient({ plans, featureCatalog }: { plans: any[]; featureCatalog: readonly any[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-400">Oferta SaaS</p><h1 className="mt-1 text-2xl font-black text-white">Planes SaaS</h1><p className="mt-1 text-sm text-slate-400">Precios, límites y módulos heredados por cada inmobiliaria.</p></div><button onClick={() => setCreating(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white"><Plus className="h-4 w-4" />Nuevo plan</button></header>
    {creating && <PlanEditor plan={null} featureCatalog={featureCatalog} onDone={() => { setCreating(false); router.refresh(); }} />}
    <div className="grid gap-5 xl:grid-cols-3">{plans.map((plan) => <PlanEditor key={plan.id} plan={plan} featureCatalog={featureCatalog} onDone={() => router.refresh()} />)}</div>
  </div>;
}

function PlanEditor({ plan, featureCatalog, onDone }: { plan: any | null; featureCatalog: readonly any[]; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState(() => plan ? {
    id: plan.id, code: plan.code, name: plan.name, description: plan.description || '', priceMonthly: plan.priceMonthly, priceYearly: plan.priceYearly,
    maxProperties: plan.maxProperties, maxGarages: plan.maxGarages, maxUsers: plan.maxUsers, maxPublications: plan.maxPublications, isActive: plan.isActive,
    features: featureCatalog.filter((feature) => plan.features?.[feature.key] !== false).map((feature) => feature.key),
  } : { code: '', name: '', description: '', priceMonthly: 0, priceYearly: 0, maxProperties: 30, maxGarages: 5, maxUsers: 2, maxPublications: 30, isActive: true, features: featureCatalog.map((feature) => feature.key) });

  function toggleFeature(key: string) { setDraft((current: any) => ({ ...current, features: current.features.includes(key) ? current.features.filter((item: string) => item !== key) : [...current.features, key] })); }
  function save() {
    setMessage('');
    startTransition(async () => {
      try {
        await savePlanAction({ ...draft, priceMonthly: Number(draft.priceMonthly), priceYearly: Number(draft.priceYearly), maxProperties: Number(draft.maxProperties), maxGarages: Number(draft.maxGarages), maxUsers: Number(draft.maxUsers), maxPublications: Number(draft.maxPublications) });
        setMessage('Plan guardado correctamente.'); onDone();
      } catch (error: any) { setMessage(error?.message || 'No se pudo guardar el plan.'); }
    });
  }

  return <section className={`rounded-2xl border bg-slate-900 p-5 shadow-xl ${plan ? 'border-slate-800' : 'border-indigo-700'}`}>
    <div className="mb-5 flex items-start justify-between gap-3"><div><span className="inline-flex rounded-full border border-emerald-800 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-black text-emerald-300">{plan ? plan.code : 'NUEVO PLAN'}</span>{plan && <p className="mt-2 text-[10px] text-slate-500">{plan.subscriptions} suscripciones · {formatCurrency(plan.priceMonthly)}/mes</p>}</div><label className="flex items-center gap-2 text-xs font-bold text-slate-400"><input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />Activo</label></div>
    <div className="space-y-4">
      {!plan && <label className="block text-xs font-bold text-slate-400">Código técnico *<input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} className={fieldClass} placeholder="INMOBILIARIA_PRO" /></label>}
      {plan && <div className="rounded-xl bg-slate-950 px-3 py-2 text-[11px] text-slate-500">Código estable: <strong className="font-mono text-slate-300">{plan.code}</strong></div>}
      <label className="block text-xs font-bold text-slate-400">Nombre<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={fieldClass} /></label>
      <label className="block text-xs font-bold text-slate-400">Descripción<textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={`${fieldClass} resize-none`} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-400">Precio mensual<input type="number" min="0" value={draft.priceMonthly} onChange={(e) => setDraft({ ...draft, priceMonthly: Number(e.target.value) })} className={fieldClass} /></label><label className="text-xs font-bold text-slate-400">Precio anual<input type="number" min="0" value={draft.priceYearly} onChange={(e) => setDraft({ ...draft, priceYearly: Number(e.target.value) })} className={fieldClass} /></label></div>
      <div className="grid grid-cols-2 gap-2"><Limit icon={Building2} label="Propiedades" value={draft.maxProperties} set={(value) => setDraft({ ...draft, maxProperties: value })} /><Limit icon={Building2} label="Cocheras" value={draft.maxGarages} set={(value) => setDraft({ ...draft, maxGarages: value })} /><Limit icon={UsersRound} label="Usuarios" value={draft.maxUsers} set={(value) => setDraft({ ...draft, maxUsers: value })} /><Limit icon={Layers3} label="Publicaciones" value={draft.maxPublications} set={(value) => setDraft({ ...draft, maxPublications: value })} /></div>
      <div className="border-t border-slate-800 pt-4"><p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Módulos incluidos</p><div className="space-y-2">{featureCatalog.map((feature) => { const active = draft.features.includes(feature.key); return <button type="button" key={feature.key} onClick={() => toggleFeature(feature.key)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${active ? 'border-emerald-800 bg-emerald-950/30' : 'border-slate-800 bg-slate-950/60'}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-600'}`}>{active && <Check className="h-3.5 w-3.5" />}</span><span><strong className={active ? 'text-emerald-200' : 'text-slate-400'}>{feature.label}</strong><small className="mt-0.5 block text-[10px] text-slate-600">{feature.description}</small></span></button>; })}</div></div>
      {message && <p className={`rounded-xl p-3 text-xs font-semibold ${message.startsWith('Plan guardado') ? 'bg-emerald-950/40 text-emerald-300' : 'bg-rose-950/40 text-rose-300'}`}>{message}</p>}
      <button disabled={pending} onClick={save} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save className="h-4 w-4" />{pending ? 'Guardando...' : 'Guardar plan'}</button>
    </div>
  </section>;
}

function Limit({ icon: Icon, label, value, set }: { icon: any; label: string; value: number; set: (value: number) => void }) {
  return <label className="text-[10px] font-bold text-slate-500"><span className="flex items-center gap-1"><Icon className="h-3 w-3" />{label}</span><input type="number" min="0" value={value} onChange={(e) => set(Number(e.target.value))} className={fieldClass} /></label>;
}
