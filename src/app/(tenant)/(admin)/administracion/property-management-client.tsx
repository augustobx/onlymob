'use client';

import { useState, useTransition } from 'react';
import { CircleDollarSign, Plus, ReceiptText, Repeat2, WalletCards } from 'lucide-react';
import { createOwnerSettlementAction, generateRecurringChargesAction, savePropertyExpenseAction, saveRecurringChargeAction, setOwnerSettlementStatusAction, setPropertyExpenseStatusAction } from '@/actions/property-management';
import { Drawer, EmptyState, FormSection, WorkspaceMetric, WorkspaceMetrics, WorkspaceTab, WorkspaceTabs, WorkspaceToolbar } from '@/components/ui/workspace';

export function PropertyManagementClient({ data }: { data: any }) {
  const [tab, setTab] = useState<'EXPENSES'|'RECURRING'|'SETTLEMENTS'>('EXPENSES');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const run = (task: () => Promise<any>, reload = true) => {
    setError(''); setMessage('');
    startTransition(async()=>{ try { const result=await task(); if(reload) window.location.reload(); else setMessage(`Generación completada: ${result.created} cargos.`); } catch(err:any){ setError(err?.message||'No se pudo completar la operación.'); } });
  };
  const money=(v:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(v||0);

  function submitExpense(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);run(()=>savePropertyExpenseAction({propertyId:String(f.get('propertyId')||''),providerContactId:String(f.get('providerContactId')||'')||null,ownerContactId:String(f.get('ownerContactId')||'')||null,category:String(f.get('category')||''),description:String(f.get('description')||''),amount:Number(f.get('amount')||0),dueDate:String(f.get('dueDate')||'')||null,status:'PENDING',chargeToRenter:f.get('chargeToRenter')==='on',chargeToOwner:f.get('chargeToOwner')==='on',documentUrl:String(f.get('documentUrl')||''),notes:String(f.get('notes')||'')}));}
  function submitRecurring(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);run(()=>saveRecurringChargeAction({propertyLeaseId:String(f.get('propertyLeaseId')||''),type:String(f.get('type')||'EXPENSAS') as any,description:String(f.get('description')||''),amount:f.get('amount')?Number(f.get('amount')):null,percentage:f.get('percentage')?Number(f.get('percentage')):null,frequencyMonths:Number(f.get('frequencyMonths')||1),dueDay:Number(f.get('dueDay')||10),startsAt:String(f.get('startsAt')||''),endsAt:String(f.get('endsAt')||'')||null,active:true}));}
  function submitSettlement(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);run(()=>createOwnerSettlementAction({ownerContactId:String(f.get('ownerContactId')||''),periodStart:String(f.get('periodStart')||''),periodEnd:String(f.get('periodEnd')||''),taxPercent:f.get('taxPercent')?Number(f.get('taxPercent')):0,notes:String(f.get('notes')||'')}));}
  function generate(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);run(()=>generateRecurringChargesAction(String(f.get('period')||'')),false);}

  const pendingExpenses=data.expenses.filter((e:any)=>e.status==='PENDING').reduce((s:number,e:any)=>s+e.amount,0);
  const readySettlements=data.settlements.filter((s:any)=>s.status==='READY').reduce((sum:number,s:any)=>sum+s.netAmount,0);
  const activeRules=data.recurringCharges.filter((r:any)=>r.active).length;

  return <div className="space-y-5">
    <WorkspaceMetrics>
      <WorkspaceMetric icon={<ReceiptText className="w-5 h-5"/>} label="Gastos pendientes" value={money(pendingExpenses)} />
      <WorkspaceMetric icon={<Repeat2 className="w-5 h-5"/>} label="Cargos recurrentes" value={String(activeRules)} detail="Reglas activas" />
      <WorkspaceMetric icon={<WalletCards className="w-5 h-5"/>} label="A liquidar" value={money(readySettlements)} />
    </WorkspaceMetrics>

    <WorkspaceToolbar>
      <WorkspaceTabs>
        <WorkspaceTab active={tab==='EXPENSES'} onClick={()=>{setTab('EXPENSES');setShowForm(false)}}>Gastos</WorkspaceTab>
        <WorkspaceTab active={tab==='RECURRING'} onClick={()=>{setTab('RECURRING');setShowForm(false)}}>Cargos recurrentes</WorkspaceTab>
        <WorkspaceTab active={tab==='SETTLEMENTS'} onClick={()=>{setTab('SETTLEMENTS');setShowForm(false)}}>Liquidaciones</WorkspaceTab>
      </WorkspaceTabs>
      <button onClick={()=>setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4"/>{tab==='EXPENSES'?'Nuevo gasto':tab==='RECURRING'?'Nueva regla':'Nueva liquidación'}</button>
    </WorkspaceToolbar>

    {error&&<div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700">{error}</div>}
    {message&&<div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700">{message}</div>}

    {tab==='EXPENSES'&&<section className="ui-list-shell">{data.expenses.length===0?<EmptyState title="No hay gastos registrados" description="Los gastos de propiedades aparecerán acá."/>:data.expenses.map((e:any)=><div key={e.id} className="ui-list-row"><div><div className="ui-list-row__title">{e.category} · {e.description}</div><div className="ui-list-row__meta">{e.property.code} · {e.property.address}</div></div><div><div className="text-[10px] text-slate-400">Proveedor</div><div className="text-xs font-semibold text-slate-700">{e.provider?(e.provider.companyName||`${e.provider.firstName} ${e.provider.lastName}`):'Sin proveedor'}</div></div><div><div className="text-[10px] text-slate-400">Importe</div><div className="text-xs font-bold text-slate-900">{money(e.amount)}</div></div><div className="ui-actions"><Status value={e.status}/>{e.status==='PENDING'&&<button onClick={()=>run(()=>setPropertyExpenseStatusAction(e.id,'PAID'))} className="ui-action-secondary">Marcar pagado</button>}</div></div>)}</section>}

    {tab==='RECURRING'&&<div className="space-y-4"><form onSubmit={generate} className="section-card p-4 flex flex-col md:flex-row md:items-end gap-3"><Field name="period" label="Generar cargos del período" type="month" defaultValue={new Date().toISOString().slice(0,7)}/><button disabled={isPending} className="btn-primary">Generar deudas</button></form><section className="ui-list-shell">{data.recurringCharges.length===0?<EmptyState title="No hay cargos recurrentes"/>:data.recurringCharges.map((r:any)=><div key={r.id} className="ui-list-row"><div><div className="ui-list-row__title">{r.description}</div><div className="ui-list-row__meta">{r.lease.property.code} · {r.lease.renter.firstName} {r.lease.renter.lastName}</div></div><div><div className="text-[10px] text-slate-400">Frecuencia</div><div className="text-xs font-semibold">Cada {r.frequencyMonths} mes/es</div></div><div><div className="text-[10px] text-slate-400">Importe</div><div className="text-xs font-bold">{r.amount!=null?money(r.amount):`${r.percentage}% alquiler`}</div></div><Status value={r.active?'ACTIVO':'INACTIVO'}/></div>)}</section></div>}

    {tab==='SETTLEMENTS'&&<div className="space-y-4">{data.settlements.length===0?<section className="section-card"><EmptyState title="Todavía no hay liquidaciones"/></section>:data.settlements.map((s:any)=><article key={s.id} className="section-card"><div className="section-card__header"><div><div className="flex items-center gap-2"><h3 className="section-card__title">{s.owner.firstName} {s.owner.lastName}</h3><Status value={s.status}/></div><p className="section-card__subtitle">{new Date(s.periodStart).toLocaleDateString('es-AR')} — {new Date(s.periodEnd).toLocaleDateString('es-AR')}</p></div><div className="text-right"><p className="text-[9px] text-slate-400">Neto propietario</p><p className="text-xl font-bold text-indigo-600">{money(s.netAmount)}</p></div></div><div className="section-card__body"><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Mini label="Cobrado" value={money(s.grossCollected)}/><Mini label="Gastos" value={money(s.expensesTotal)}/><Mini label="Comisión" value={money(s.commissionTotal)}/><Mini label="Retenciones" value={money(s.taxesTotal)}/></div><details className="mt-4"><summary className="text-xs font-semibold text-slate-600 cursor-pointer">Ver detalle ({s.lines.length})</summary><div className="mt-2 divide-y border rounded-lg">{s.lines.map((l:any)=><div key={l.id} className="p-2 flex justify-between text-xs"><span>{l.property?.code?`${l.property.code} · `:''}{l.description}</span><span className={l.amount<0?'text-rose-600':'text-emerald-600'}>{money(l.amount)}</span></div>)}</div></details>{s.status==='READY'&&<div className="mt-4 flex justify-end"><button onClick={()=>run(()=>setOwnerSettlementStatusAction(s.id,'PAID'))} className="btn-primary"><CircleDollarSign className="w-3.5 h-3.5"/>Marcar liquidada</button></div>}</div></article>)}</div>}

    <Drawer open={showForm} onClose={()=>setShowForm(false)} title={tab==='EXPENSES'?'Nuevo gasto':tab==='RECURRING'?'Nuevo cargo recurrente':'Generar liquidación'} subtitle="Completá los datos sin perder el contexto del listado." width="wide">
      {tab==='EXPENSES'&&<form onSubmit={submitExpense}><FormSection title="Datos del gasto"><Select name="propertyId" label="Propiedad *" options={data.properties.map((p:any)=>[p.id,`${p.code} · ${p.address}`])}/><Select name="providerContactId" label="Proveedor" options={[['','Sin proveedor'],...data.providers.map((p:any)=>[p.id,p.companyName||`${p.firstName} ${p.lastName}`])]}/><Select name="ownerContactId" label="Propietario" options={[['','Distribución general'],...data.owners.map((o:any)=>[o.id,`${o.firstName} ${o.lastName}`])]}/><Field name="category" label="Categoría *" placeholder="Impuesto, reparación..."/><Field name="description" label="Descripción *"/><Field name="amount" label="Importe *" type="number"/><Field name="dueDate" label="Vencimiento" type="date"/><Field name="documentUrl" label="Comprobante URL"/></FormSection><FormSection title="Imputación"><Check name="chargeToOwner" label="A cargo propietario" defaultChecked/><Check name="chargeToRenter" label="Repercutir inquilino"/><Field name="notes" label="Notas"/></FormSection><Actions close={()=>setShowForm(false)} pending={isPending} label="Guardar gasto"/></form>}
      {tab==='RECURRING'&&<form onSubmit={submitRecurring}><FormSection title="Regla recurrente"><Select name="propertyLeaseId" label="Contrato *" options={data.leases.map((l:any)=>[l.id,`${l.property.code} · ${l.renter.firstName} ${l.renter.lastName}`])}/><Select name="type" label="Tipo" options={[['EXPENSAS','Expensas'],['LUZ','Luz'],['GAS','Gas'],['AGUA','Agua'],['SEGURO','Seguro'],['IMPUESTO','Impuesto'],['PENALIDAD','Penalidad'],['OTROS','Otros']]}/><Field name="description" label="Descripción *"/><Field name="amount" label="Importe fijo" type="number"/><Field name="percentage" label="% sobre alquiler" type="number"/><Field name="frequencyMonths" label="Cada N meses" type="number" defaultValue="1"/><Field name="dueDay" label="Día vencimiento" type="number" defaultValue="10"/><Field name="startsAt" label="Desde *" type="date"/><Field name="endsAt" label="Hasta" type="date"/></FormSection><Actions close={()=>setShowForm(false)} pending={isPending} label="Guardar regla"/></form>}
      {tab==='SETTLEMENTS'&&<form onSubmit={submitSettlement}><FormSection title="Período y propietario"><Select name="ownerContactId" label="Propietario *" options={data.owners.map((o:any)=>[o.id,`${o.firstName} ${o.lastName}`])}/><Field name="periodStart" label="Desde *" type="date"/><Field name="periodEnd" label="Hasta *" type="date"/><Field name="taxPercent" label="Retenciones %" type="number" defaultValue="0"/><Field name="notes" label="Notas"/></FormSection><Actions close={()=>setShowForm(false)} pending={isPending} label="Calcular y generar"/></form>}
    </Drawer>
  </div>;
}

function Actions({close,pending,label}:{close:()=>void;pending:boolean;label:string}){return <div className="ui-form-actions"><button type="button" onClick={close} className="btn-secondary">Cancelar</button><button disabled={pending} className="btn-primary">{label}</button></div>}
function Field({name,label,type='text',placeholder,defaultValue}:{name:string;label:string;type?:string;placeholder?:string;defaultValue?:string}){return <label><span className="form-label">{label}</span><input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} className="form-input"/></label>}
function Select({name,label,options}:{name:string;label:string;options:any[]}){return <label><span className="form-label">{label}</span><select name={name} className="form-input">{options.map((o:any)=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>}
function Check({name,label,defaultChecked}:{name:string;label:string;defaultChecked?:boolean}){return <label className="flex items-center gap-2 text-xs text-slate-600"><input name={name} type="checkbox" defaultChecked={defaultChecked}/>{label}</label>}
function Status({value}:{value:string}){return <span className="px-2 py-1 bg-slate-100 rounded-full text-[9px] font-bold text-slate-600">{value}</span>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[9px] uppercase tracking-wide font-bold text-slate-400">{label}</div><div className="mt-1 text-sm font-bold text-slate-800">{value}</div></div>}
