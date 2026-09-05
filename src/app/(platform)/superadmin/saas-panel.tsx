'use client';

import { useState, useTransition } from 'react';
import { setTenantFeatureAction, startTenantImpersonationAction, updateTenantSubscriptionAction } from '@/actions/saas-admin';
import { formatCurrency } from '@/lib/utils';

export function SaasPanel({ data }: { data:any }) {
  const [isPending,startTransition]=useTransition(); const [message,setMessage]=useState('');
  return <section className="space-y-5">
    <h2 className="text-lg font-bold text-white">Control SaaS</h2>
    {message&&<div className="p-3 rounded-lg bg-indigo-950 border border-indigo-800 text-xs text-indigo-200">{message}</div>}
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <Metric label="Tenants" value={data.metrics.tenants}/><Metric label="Activos" value={data.metrics.activeTenants}/><Metric label="Trials" value={data.metrics.trials}/><Metric label="Past due" value={data.metrics.pastDue}/><Metric label="MRR" value={formatCurrency(data.metrics.mrr)}/><Metric label="Usuarios" value={data.metrics.users}/>
    </div>
    <div className="space-y-4">{data.tenants.map((tenant:any)=>{
      const e=tenant.entitlement; const plan=e?data.plans.find((p:any)=>p.id===e.planId):null;
      return <div key={tenant.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><b className="text-white">{tenant.name}</b><p className="text-xs text-slate-400">{tenant.domain||tenant.slug} · {e?.status||'SIN SUSCRIPCIÓN'}</p></div><button disabled={isPending||tenant.status!=='ACTIVE'} onClick={()=>startTransition(async()=>{try{const r=await startTenantImpersonationAction(tenant.id); window.open(r.url,'_blank','noopener,noreferrer'); setMessage('Acceso de soporte generado por 5 minutos y auditado.');}catch(err:any){setMessage(err?.message||'No se pudo generar acceso.')}})} className="text-xs font-bold text-indigo-300 disabled:text-slate-600">Entrar como soporte</button></div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs"><Usage label="Propiedades" value={tenant.usage.properties} limit={e?.maxProperties}/><Usage label="Usuarios" value={tenant.usage.users} limit={e?.maxUsers}/><Usage label="Publicaciones" value={tenant.usage.publications} limit={e?.maxPublications}/></div>
        <div className="flex flex-col md:flex-row gap-2">
          <select aria-label={`Plan de ${tenant.name}`} defaultValue={e?.planId||data.plans[0]?.id} id={`plan-${tenant.id}`} className="bg-slate-950 border border-slate-700 rounded px-2 py-2 text-xs flex-1">{data.plans.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select aria-label={`Estado de suscripción de ${tenant.name}`} defaultValue={e?.status||'ACTIVE'} id={`status-${tenant.id}`} className="bg-slate-950 border border-slate-700 rounded px-2 py-2 text-xs"><option>TRIAL</option><option>ACTIVE</option><option>PAST_DUE</option><option>SUSPENDED</option><option>CANCELED</option></select>
          <button disabled={isPending} onClick={()=>{const planId=(document.getElementById(`plan-${tenant.id}`) as HTMLSelectElement).value; const status=(document.getElementById(`status-${tenant.id}`) as HTMLSelectElement).value as any; startTransition(async()=>{await updateTenantSubscriptionAction({tenantId:tenant.id,planId,status,trialDays:15}); location.reload();});}} className="px-3 py-2 bg-indigo-600 rounded text-xs font-bold">Aplicar</button>
        </div>
        <div className="flex flex-wrap gap-2">{['analytics','integrations','owner_portal','renter_portal','automation'].map((key)=>{const enabled=tenant.features[key]!==false; return <button key={key} disabled={isPending} onClick={()=>startTransition(async()=>{await setTenantFeatureAction(tenant.id,key,!enabled); location.reload();})} className={`px-2 py-1 rounded text-[11px] border ${enabled?'border-emerald-800 text-emerald-300':'border-slate-700 text-slate-500'}`}>{key}: {enabled?'ON':'OFF'}</button>})}</div>
      </div>})}</div>
  </section>;
}
function Metric({label,value}:{label:string;value:string|number}){return <div className="bg-slate-900 border border-slate-800 rounded-xl p-3"><span className="text-[10px] uppercase text-slate-500 font-bold">{label}</span><strong className="block mt-1 text-white text-base">{value}</strong></div>}
function Usage({label,value,limit}:{label:string;value:number;limit?:number}){return <div className="bg-slate-950 rounded-lg p-2"><span className="text-slate-500 block text-[10px]">{label}</span><b>{value}/{limit??'∞'}</b></div>}
