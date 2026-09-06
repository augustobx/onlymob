'use client';

import { useMemo, useState, useTransition } from 'react';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { recordPaymentAction, getReceiptDetailsAction } from '@/actions/debts-payments';
import { Drawer, EmptyState, WorkspaceMetric, WorkspaceMetrics, WorkspaceToolbar } from '@/components/ui/workspace';
import { WorkspaceSearch } from '@/components/ui/workspace-search';

interface DebtItem {
  id:string;leaseType:string;type:string;description:string;amount:number;paidAmount:number;remaining:number;dueDate:Date;status:string;assetLabel:string;
  renter:{id:string;name:string;dni:string;phone?:string|null;email?:string|null};
  payments:Array<{id:string;amount:number;paidAt:Date;method:string;reference?:string|null;receiptNumber?:string|null}>;
}

function currentMonth(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`}

export function DebtsClient({ initialDebts }: { initialDebts: DebtItem[] }) {
  const [search,setSearch]=useState(''); const [statusFilter,setStatusFilter]=useState('ALL'); const [isPending,startTransition]=useTransition(); const [selectedDebt,setSelectedDebt]=useState<DebtItem|null>(null); const [payAmount,setPayAmount]=useState(0); const [receiptData,setReceiptData]=useState<any|null>(null); const [error,setError]=useState(''); const [receiptPeriod,setReceiptPeriod]=useState(currentMonth); const [receiptsPerPage,setReceiptsPerPage]=useState<6|8>(8);
  const filtered=useMemo(()=>initialDebts.filter(d=>{const q=search.toLowerCase();const match=!q||d.renter.name.toLowerCase().includes(q)||d.renter.dni.includes(search)||d.description.toLowerCase().includes(q)||d.assetLabel.toLowerCase().includes(q);return match&&(statusFilter==='ALL'||d.status===statusFilter)}),[initialDebts,search,statusFilter]);
  const pending=initialDebts.filter(d=>d.status!=='PAID').reduce((s,d)=>s+d.remaining,0); const overdue=initialDebts.filter(d=>d.status==='OVERDUE').reduce((s,d)=>s+d.remaining,0); const collected=initialDebts.reduce((s,d)=>s+d.paidAmount,0);
  function openPay(d:DebtItem){setSelectedDebt(d);setPayAmount(d.remaining);setError('')}
  function savePayment(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!selectedDebt)return;const f=new FormData(e.currentTarget);startTransition(async()=>{try{setError('');const res=await recordPaymentAction({debtId:selectedDebt.id,amount:parseFloat(String(f.get('amount')||0)),method:String(f.get('method')) as any,reference:String(f.get('reference')||'')||undefined,notes:String(f.get('notes')||'')||undefined});setSelectedDebt(null);const receipt=await getReceiptDetailsAction(res.paymentId);setReceiptData(receipt)}catch(err:any){setError(err?.message||'No se pudo registrar la cobranza.')}})}
  function viewReceipt(paymentId:string){startTransition(async()=>{const receipt=await getReceiptDetailsAction(paymentId);setReceiptData(receipt)})}
  return <div className="space-y-5">
    <WorkspaceMetrics><WorkspaceMetric label="Saldo pendiente" value={formatCurrency(pending)} detail={`${initialDebts.filter(d=>d.status!=='PAID').length} deudas abiertas`}/><WorkspaceMetric label="Vencido" value={formatCurrency(overdue)} detail="Requiere seguimiento"/><WorkspaceMetric label="Cobrado" value={formatCurrency(collected)} detail="Acumulado registrado"/></WorkspaceMetrics>

    <section id="recibos-mes" className="scroll-mt-28 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><Printer className="h-4 w-4 text-indigo-600"/><h3 className="text-sm font-black text-indigo-950">Recibos del mes</h3></div>
          <p className="mt-1 text-[11px] text-indigo-800">Impresión compacta en A4 apaisado, igual al formato operativo: 8 por hoja por defecto o 6 si necesitás más alto.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label><span className="form-label">Mes</span><input type="month" value={receiptPeriod} onChange={e=>setReceiptPeriod(e.target.value)} className="form-input !w-auto"/></label>
          <label><span className="form-label">Por hoja</span><select value={receiptsPerPage} onChange={e=>setReceiptsPerPage(Number(e.target.value) as 6|8)} className="form-input !w-auto"><option value={8}>8 recibos</option><option value={6}>6 recibos</option></select></label>
          <a href={`/impresion/recibos?mes=${receiptPeriod}&porHoja=${receiptsPerPage}`} target="_blank" rel="noreferrer" className="btn-primary"><Printer className="h-4 w-4"/>Imprimir recibos</a>
        </div>
      </div>
    </section>

    <WorkspaceToolbar><div className="ui-filter-row"><WorkspaceSearch value={search} onChange={setSearch} placeholder="Buscar inquilino, DNI, inmueble o concepto..."/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="form-input !w-auto"><option value="ALL">Todos los estados</option><option value="PENDING">Pendientes</option><option value="OVERDUE">Vencidos</option><option value="PARTIAL">Parciales</option><option value="PAID">Pagados</option></select></div><span className="text-[10px] text-slate-500">{filtered.length} registros</span></WorkspaceToolbar>
    <section className="ui-list-shell">{filtered.length===0?<EmptyState title="No hay cobranzas para esta vista"/>:filtered.map(d=>{const latest=d.payments[0];return <div key={d.id} className="ui-list-row"><div><div className="ui-list-row__title">{d.renter.name}</div><div className="ui-list-row__meta">DNI {d.renter.dni} · {d.description} · {d.assetLabel}</div></div><div><div className="text-[9px] text-slate-400">Vencimiento</div><div className="text-xs font-semibold">{formatDate(d.dueDate)}</div></div><div><div className="text-[9px] text-slate-400">Saldo</div><div className={`text-xs font-bold ${d.status==='OVERDUE'?'text-rose-600':'text-slate-900'}`}>{formatCurrency(d.remaining)}</div></div><div className="ui-actions"><Status value={d.status}/>{d.status!=='PAID'&&<button type="button" onClick={()=>openPay(d)} className="btn-primary">Cobrar</button>}{latest&&<button type="button" onClick={()=>viewReceipt(latest.id)} className="ui-action-secondary"><Printer className="w-3.5 h-3.5"/>Recibo</button>}</div></div>})}</section>
    <Drawer open={!!selectedDebt} onClose={()=>setSelectedDebt(null)} title="Registrar cobranza" subtitle={selectedDebt?`${selectedDebt.renter.name} · ${selectedDebt.description}`:''}>
      {selectedDebt&&<form onSubmit={savePayment}>{error&&<div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700">{error}</div>}<div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-4"><div className="text-[9px] uppercase font-bold tracking-wide text-slate-400">Saldo pendiente</div><div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(selectedDebt.remaining)}</div><div className="mt-1 text-[10px] text-slate-500">Vence {formatDate(selectedDebt.dueDate)}</div></div><div className="space-y-4"><Field name="amount" label="Importe" type="number" step="0.01" value={String(payAmount)} onChange={v=>setPayAmount(Number(v))}/><label><span className="form-label">Medio de pago</span><select name="method" className="form-input"><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="TARJETA">Tarjeta</option><option value="MERCADOPAGO">Mercado Pago</option><option value="OTRO">Otro</option></select></label><Field name="reference" label="Referencia"/><label><span className="form-label">Notas</span><textarea name="notes" rows={4} className="form-input"/></label></div><div className="ui-form-actions"><button type="button" onClick={()=>setSelectedDebt(null)} className="btn-secondary">Cancelar</button><button disabled={isPending} className="btn-primary">Registrar pago</button></div></form>}
    </Drawer>
    {receiptData&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><div><p className="text-[9px] uppercase font-bold tracking-wider text-indigo-600">Recibo</p><h3 className="text-lg font-bold text-slate-900">{receiptData.receiptNumber||'Comprobante de pago'}</h3></div><button onClick={()=>setReceiptData(null)} className="icon-action"><X className="w-4 h-4"/></button></div><div className="p-5 space-y-3 text-sm"><Row label="Inquilino" value={receiptData.renter?.name||'—'}/><Row label="Concepto" value={receiptData.concept||'—'}/><Row label="Importe" value={formatCurrency(receiptData.amount||0)}/><Row label="Fecha" value={receiptData.paymentDate?formatDate(receiptData.paymentDate):'—'}/><Row label="Medio" value={receiptData.method||'—'}/></div><div className="flex justify-end gap-2 border-t p-4"><button onClick={()=>window.print()} className="btn-primary"><Printer className="w-4 h-4"/>Imprimir</button></div></div></div>}
  </div>
}
function Field({name,label,type='text',step,value,onChange}:{name:string;label:string;type?:string;step?:string;value?:string;onChange?:(v:string)=>void}){return <label><span className="form-label">{label}</span><input name={name} type={type} step={step} value={value} onChange={onChange?e=>onChange(e.target.value):undefined} className="form-input"/></label>}
function Status({value}:{value:string}){const map:any={PAID:['Pagado','status-pill--success'],OVERDUE:['Vencido','status-pill--danger'],PARTIAL:['Parcial','status-pill--warning'],PENDING:['Pendiente','status-pill--neutral']};const [label,klass]=map[value]||[value,'status-pill--neutral'];return <span className={`status-pill ${klass}`}>{label}</span>}
function Row({label,value}:{label:string;value:string}){return <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><span className="text-slate-500">{label}</span><strong className="text-right text-slate-900">{value}</strong></div>}
