'use client';

import { useState, useTransition } from 'react';
import { ShieldCheck, Pencil, CalendarClock } from 'lucide-react';
import { updatePropertyLeaseProfessionalAction } from '@/actions/lease-professional';
import { formatCurrency, formatDate } from '@/lib/utils';

export function ProfessionalLeaseManager({ data }: { data: any }) {
  const [editing, setEditing] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editing) return;
    const f = new FormData(e.currentTarget);
    setError('');
    startTransition(async () => {
      try {
        await updatePropertyLeaseProfessionalAction({
          leaseId: editing.id,
          guarantorContactId: String(f.get('guarantorContactId') || '') || null,
          extensionUntil: String(f.get('extensionUntil') || '') || null,
          adjustmentMethod: String(f.get('adjustmentMethod') || 'FIXED_PERCENT'),
          adjustmentIndex: String(f.get('adjustmentIndex') || '') || null,
          nextAdjustmentDate: String(f.get('nextAdjustmentDate') || '') || null,
          guaranteeType: String(f.get('guaranteeType') || '') || null,
          guaranteeDetails: String(f.get('guaranteeDetails') || '') || null,
          renewalReference: String(f.get('renewalReference') || '') || null,
          inventoryNotes: String(f.get('inventoryNotes') || '') || null,
          status: String(f.get('status') || 'CURRENT') as any,
          notes: String(f.get('notes') || '') || null,
        });
        window.location.reload();
      } catch (err: any) { setError(err?.message || 'No se pudo actualizar el contrato.'); }
    });
  }

  return <section className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
    <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5"/></div><div><h2 className="font-bold text-slate-900">Gestión contractual profesional</h2><p className="text-xs text-slate-500">Garantías, ajustes programados, prórrogas e inventario.</p></div></div>
    {error&&<div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700">{error}</div>}
    <div className="grid lg:grid-cols-2 gap-3">{data.leases.map((lease:any)=><div key={lease.id} className="border border-slate-200 rounded-lg p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-sm">{lease.propertyCode} · {lease.renterName}</p><p className="text-xs text-slate-500 mt-1">{lease.propertyAddress}</p></div><button onClick={()=>setEditing(lease)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-4 h-4"/></button></div><div className="grid grid-cols-2 gap-2 mt-3 text-xs"><Info label="Alquiler" value={formatCurrency(lease.currentRent)}/><Info label="Estado" value={lease.status}/><Info label="Ajuste" value={lease.adjustmentIndex||lease.adjustmentMethod}/><Info label="Próximo ajuste" value={lease.nextAdjustmentDate?formatDate(lease.nextAdjustmentDate):'-'}/><Info label="Garantía" value={lease.guaranteeType||'-'}/><Info label="Garante" value={lease.guarantor?`${lease.guarantor.firstName} ${lease.guarantor.lastName}`:'-'}/></div></div>)}{data.leases.length===0&&<div className="lg:col-span-2 py-8 text-center text-sm text-slate-400">No hay contratos de inmuebles.</div>}</div>

    {editing&&<form onSubmit={submit} className="mt-5 border-t pt-5 grid md:grid-cols-4 gap-3"><div className="md:col-span-4 flex justify-between"><div><h3 className="font-bold text-sm">Editar {editing.propertyCode}</h3><p className="text-xs text-slate-500">{editing.renterName}</p></div><button type="button" onClick={()=>setEditing(null)} className="text-xs text-slate-500">Cerrar</button></div><Select name="status" label="Estado" defaultValue={editing.status} options={[['DRAFT','Borrador'],['CURRENT','Vigente'],['EXPIRING','Por vencer'],['RENEWED','Renovado'],['TERMINATED','Finalizado'],['CANCELED','Cancelado']]}/><Select name="adjustmentMethod" label="Modalidad ajuste" defaultValue={editing.adjustmentMethod} options={[['FIXED_PERCENT','Porcentaje fijo'],['ICL','ICL / BCRA'],['IPC','IPC'],['MANUAL','Manual'],['OTHER','Otra']]}/><Field name="adjustmentIndex" label="Índice / referencia" defaultValue={editing.adjustmentIndex||''}/><Field name="nextAdjustmentDate" label="Próximo ajuste" type="date" defaultValue={dateInput(editing.nextAdjustmentDate)}/><Select name="guarantorContactId" label="Garante" defaultValue={editing.guarantorContactId||''} options={[['','Sin garante'],...data.guarantors.map((g:any)=>[g.id,`${g.name}${g.documentNumber?` · ${g.documentNumber}`:''}`])]}/><Field name="guaranteeType" label="Tipo garantía" defaultValue={editing.guaranteeType||''} placeholder="Propietaria, seguro caución..."/><Field name="extensionUntil" label="Prórroga hasta" type="date" defaultValue={dateInput(editing.extensionUntil)}/><Field name="renewalReference" label="Referencia renovación" defaultValue={editing.renewalReference||''}/><Text name="guaranteeDetails" label="Detalle garantía" defaultValue={editing.guaranteeDetails||''} className="md:col-span-2"/><Text name="inventoryNotes" label="Inventario / estado de ingreso" defaultValue={editing.inventoryNotes||''} className="md:col-span-2"/><Text name="notes" label="Notas contractuales" defaultValue={editing.notes||''} className="md:col-span-4"/><div className="md:col-span-4 flex justify-end"><button disabled={isPending} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold">{isPending?'Guardando...':'Guardar contrato'}</button></div></form>}
  </section>;
}

function dateInput(value:any){if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)}
function Info({label,value}:{label:string;value:string}){return <div className="bg-slate-50 rounded p-2"><span className="block text-[10px] uppercase font-bold text-slate-400">{label}</span><span className="font-semibold text-slate-700">{value}</span></div>}
function Field({name,label,type='text',defaultValue='',placeholder}:{name:string;label:string;type?:string;defaultValue?:string;placeholder?:string}){return <label><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"/></label>}
function Select({name,label,options,defaultValue}:{name:string;label:string;options:any[];defaultValue?:string}){return <label><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><select name={name} defaultValue={defaultValue} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">{options.map((o:any)=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>}
function Text({name,label,defaultValue,className=''}:{name:string;label:string;defaultValue:string;className?:string}){return <label className={className}><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><textarea name={name} defaultValue={defaultValue} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"/></label>}
