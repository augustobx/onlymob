'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, CreditCard, FileText, Home, MessageSquare, Plus, UserRound, Wrench } from 'lucide-react';
import { createRenterMaintenanceRequestAction, updateRenterPortalProfileAction } from '@/actions/renter-portal';
import { PortalCommunications } from '@/components/portal/portal-communications';
import { formatCurrency, formatDate } from '@/lib/utils';

type PortalTab = 'HOME' | 'ACCOUNT' | 'DOCUMENTS' | 'MAINTENANCE' | 'COMMUNICATIONS' | 'PROFILE';

export function RenterPortalClient({ data }: { data: any }) {
  const [tab, setTab] = useState<PortalTab>('HOME');
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const pendingDebts = useMemo(() => data.debts.filter((debt: any) => debt.status !== 'PAID'), [data.debts]);
  const totalPending = pendingDebts.reduce((sum: number, debt: any) => sum + Math.max(0, debt.amount - debt.paidAmount), 0);
  const openMaintenance = data.maintenanceRequests.filter((request: any) => !['RESOLVED', 'CANCELED'].includes(request.status));
  const unreadCommunications = (data.communications || []).filter((item: any) => !item.readAt).length;

  function run(task: () => Promise<any>, success: string) {
    setError(''); setMessage('');
    startTransition(async () => {
      try { await task(); setMessage(success); window.location.reload(); }
      catch (err: any) { setError(err?.message || 'No se pudo completar la operación.'); }
    });
  }

  function submitMaintenance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    run(() => createRenterMaintenanceRequestAction({
      propertyId: String(form.get('propertyId') || ''),
      category: String(form.get('category') || ''),
      priority: String(form.get('priority') || 'NORMAL') as any,
      title: String(form.get('title') || ''),
      description: String(form.get('description') || ''),
    }), 'Solicitud enviada.');
  }

  function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    run(() => updateRenterPortalProfileAction({
      email: String(form.get('email') || '') || null,
      phone: String(form.get('phone') || '') || null,
      address: String(form.get('address') || '') || null,
    }), 'Datos actualizados.');
  }

  return <div className="space-y-6">
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      <PortalNav active={tab==='HOME'} onClick={()=>setTab('HOME')} icon={<Home className="w-4 h-4"/>} label="Inicio" />
      <PortalNav active={tab==='ACCOUNT'} onClick={()=>setTab('ACCOUNT')} icon={<CreditCard className="w-4 h-4"/>} label="Cuenta" />
      <PortalNav active={tab==='DOCUMENTS'} onClick={()=>setTab('DOCUMENTS')} icon={<FileText className="w-4 h-4"/>} label="Documentos" />
      <PortalNav active={tab==='MAINTENANCE'} onClick={()=>setTab('MAINTENANCE')} icon={<Wrench className="w-4 h-4"/>} label="Mantenimiento" />
      <PortalNav active={tab==='COMMUNICATIONS'} onClick={()=>setTab('COMMUNICATIONS')} icon={<MessageSquare className="w-4 h-4"/>} label={`Mensajes${unreadCommunications ? ` (${unreadCommunications})` : ''}`} />
      <PortalNav active={tab==='PROFILE'} onClick={()=>setTab('PROFILE')} icon={<UserRound className="w-4 h-4"/>} label="Mis datos" />
    </div>

    {error && <div className="p-3 rounded-xl border border-rose-100 bg-rose-50 text-sm text-rose-700">{error}</div>}
    {message && <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50 text-sm text-emerald-700">{message}</div>}

    {tab==='HOME' && <div className="space-y-5">
      <section className="portal-panel flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div><p className="text-xs uppercase tracking-[.16em] font-bold text-indigo-600">Mi cuenta</p><h2 className="text-2xl font-black text-slate-950 mt-1">Hola, {data.renter.firstName}</h2><p className="text-sm text-slate-500 mt-1">DNI {data.renter.dni}</p></div>
        <div className="rounded-2xl bg-slate-950 text-white p-4 min-w-52"><p className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">Saldo pendiente</p><p className={`text-2xl font-black mt-1 ${totalPending>0?'text-rose-300':'text-emerald-300'}`}>{formatCurrency(totalPending)}</p></div>
      </section>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <PortalMetric label="Contratos" value={String(data.propertyLeases.length + data.garageLeases.length)} detail="Vínculos vigentes" />
        <PortalMetric label="Próximo vencimiento" value={data.nextDue ? formatDate(data.nextDue.dueDate) : 'Al día'} detail={data.nextDue?.description || 'Sin vencimientos'} />
        <PortalMetric label="Mantenimiento" value={String(openMaintenance.length)} detail="Solicitudes abiertas" />
        <PortalMetric label="Mensajes nuevos" value={String(unreadCommunications)} detail="Comunicaciones de la inmobiliaria" />
      </div>
      {data.nextDue && <section className="portal-panel flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5"/><div><p className="font-bold text-sm">Próximo vencimiento</p><p className="text-sm text-slate-600 mt-1">{data.nextDue.description} · {formatCurrency(data.nextDue.amount)} · vence {formatDate(data.nextDue.dueDate)}</p></div></section>}
      <section className="portal-panel"><h3 className="portal-title">Contratos vigentes</h3><div className="grid md:grid-cols-2 gap-3 mt-4">
        {data.propertyLeases.map((lease:any)=><div key={lease.id} className="portal-subcard"><div className="flex justify-between gap-2"><b>{lease.property.code}</b><Status text={lease.status}/></div><p className="text-xs text-slate-500 mt-1">{lease.property.address}</p><div className="mt-3 pt-3 border-t text-xs space-y-1"><p>Alquiler <b>{formatCurrency(lease.currentRent)}/mes</b></p><p>{formatDate(lease.startDate)} → {formatDate(lease.endDate)}</p>{lease.nextAdjustmentDate&&<p>Próximo ajuste {formatDate(lease.nextAdjustmentDate)}</p>}</div></div>)}
        {data.garageLeases.map((lease:any)=><div key={lease.id} className="portal-subcard"><div className="flex justify-between gap-2"><b>Cochera</b><Status text={lease.status}/></div><p className="text-xs text-slate-500 mt-1">Plazas {lease.spaces.map((item:any)=>item.space.spaceNumber).join(', ')}</p><div className="mt-3 pt-3 border-t text-xs"><p>Total <b>{formatCurrency(lease.totalRent)}/mes</b></p></div></div>)}
        {!data.propertyLeases.length&&!data.garageLeases.length&&<Empty text="No tenés contratos vigentes."/>}
      </div></section>
    </div>}

    {tab==='ACCOUNT' && <div className="grid lg:grid-cols-2 gap-5">
      <section className="portal-panel"><div className="flex items-center justify-between gap-3"><h3 className="portal-title">Cuenta corriente</h3><b className="text-lg">{formatCurrency(totalPending)}</b></div><div className="mt-4 divide-y divide-slate-100">{data.debts.length?data.debts.map((debt:any)=>{const balance=Math.max(0,debt.amount-debt.paidAmount);return <div key={debt.id} className="py-3 flex items-start justify-between gap-3"><div><div className="flex gap-2 items-center"><b className="text-sm">{debt.description}</b><Status text={debt.status}/></div><p className="text-xs text-slate-500 mt-1">Vence {formatDate(debt.dueDate)}</p></div><b className="text-sm">{formatCurrency(balance)}</b></div>}) : <Empty text="No hay movimientos pendientes."/>}</div></section>
      <section className="portal-panel"><h3 className="portal-title">Pagos y recibos</h3><div className="mt-4 divide-y divide-slate-100">{data.payments.length?data.payments.map((payment:any)=><div key={payment.id} className="py-3 flex items-start justify-between gap-3"><div><b className="text-sm">{payment.debt.description}</b><p className="text-xs text-slate-500 mt-1">{formatDate(payment.paidAt)} · {payment.method}{payment.receiptNumber?` · Recibo ${payment.receiptNumber}`:''}</p></div><b className="text-emerald-600">{formatCurrency(payment.amount)}</b></div>) : <Empty text="Todavía no hay pagos registrados."/>}</div></section>
    </div>}

    {tab==='DOCUMENTS' && <section className="portal-panel"><h3 className="portal-title">Mis documentos</h3><p className="text-xs text-slate-500 mt-1">Contratos, comprobantes y documentación compartida.</p><div className="mt-4 divide-y divide-slate-100">{data.documents.length?data.documents.map((document:any)=><div key={document.id} className="py-3 flex items-center justify-between gap-3"><div><b className="text-sm">{document.fileName}</b><p className="text-xs text-slate-500">{document.category} · {formatDate(document.uploadedAt)}</p></div><a href={document.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary">Abrir</a></div>):<Empty text="No hay documentos compartidos."/>}</div></section>}

    {tab==='MAINTENANCE' && <div className="space-y-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Mantenimiento</h3><p className="text-xs text-slate-500">Reportá un problema y seguí su estado.</p></div><button onClick={()=>setShowMaintenanceForm((value)=>!value)} className="btn-primary"><Plus className="w-4 h-4"/> Nueva solicitud</button></div>
      {showMaintenanceForm&&<form onSubmit={submitMaintenance} className="portal-panel grid md:grid-cols-2 gap-3"><Select name="propertyId" label="Propiedad *" options={data.propertyLeases.map((lease:any)=>[lease.property.id,`${lease.property.code} · ${lease.property.address}`])}/><Select name="priority" label="Prioridad" options={[['LOW','Baja'],['NORMAL','Normal'],['HIGH','Alta'],['URGENT','Urgente']]}/><Field name="category" label="Categoría *"/><Field name="title" label="Título *"/><TextArea name="description" label="Detalle *" className="md:col-span-2"/><div className="md:col-span-2 flex justify-end"><button disabled={isPending||!data.propertyLeases.length} className="btn-primary">Enviar solicitud</button></div></form>}
      <div className="grid md:grid-cols-2 gap-3">{data.maintenanceRequests.length?data.maintenanceRequests.map((request:any)=><article key={request.id} className="portal-panel"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><b>{request.title}</b><Status text={request.status}/><Priority text={request.priority}/></div><p className="text-xs text-slate-500 mt-1">{request.property.code} · {request.property.address}</p></div><span className="text-xs text-slate-400">{formatDate(request.createdAt)}</span></div><p className="text-sm text-slate-700 mt-3">{request.description}</p>{request.events?.length>0&&<div className="mt-4 border-t pt-3 space-y-1">{request.events.map((event:any)=><p key={event.id} className="text-xs text-slate-500">{formatDate(event.createdAt)} · {event.toStatus||'Actualización'}{event.note?` · ${event.note}`:''}</p>)}</div>}</article>):<Empty text="No tenés solicitudes de mantenimiento."/>}</div>
    </div>}

    {tab==='COMMUNICATIONS' && <PortalCommunications messages={data.communications || []} audience="RENTER" />}

    {tab==='PROFILE' && <section className="portal-panel"><h3 className="portal-title">Mis datos</h3><p className="text-xs text-slate-500 mt-1">Actualizá tus datos de contacto.</p><form onSubmit={submitProfile} className="grid md:grid-cols-2 gap-3 mt-5"><Field name="email" label="Email" type="email" defaultValue={data.renter.email||''}/><Field name="phone" label="Teléfono" defaultValue={data.renter.phone||''}/><Field name="address" label="Domicilio" defaultValue={data.renter.address||''} className="md:col-span-2"/><div className="md:col-span-2 flex justify-end"><button disabled={isPending} className="btn-primary">Guardar cambios</button></div></form></section>}
  </div>;
}

function PortalNav({active,onClick,icon,label}:{active:boolean;onClick:()=>void;icon:React.ReactNode;label:string}){return <button onClick={onClick} className={`portal-nav-button ${active?'portal-nav-button--active':''}`}>{icon}<span>{label}</span></button>}
function PortalMetric({label,value,detail}:{label:string;value:string;detail:string}){return <div className="portal-panel !p-4"><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">{label}</p><p className="text-xl font-black text-slate-950 mt-1">{value}</p><p className="text-xs text-slate-500 mt-1">{detail}</p></div>}
function Status({text}:{text:string}){return <span className="status-pill status-pill--info">{text}</span>}
function Priority({text}:{text:string}){return <span className={`status-pill ${['URGENT','CRITICAL'].includes(text)?'status-pill--danger':text==='HIGH'?'status-pill--warning':'status-pill--neutral'}`}>{text}</span>}
function Empty({text}:{text:string}){return <div className="empty-state">{text}</div>}
function Field({name,label,type='text',defaultValue='',className=''}:{name:string;label:string;type?:string;defaultValue?:string;className?:string}){return <label className={className}><span className="form-label">{label}</span><input name={name} type={type} defaultValue={defaultValue} className="form-input"/></label>}
function TextArea({name,label,className=''}:{name:string;label:string;className?:string}){return <label className={className}><span className="form-label">{label}</span><textarea name={name} rows={5} className="form-input"/></label>}
function Select({name,label,options}:{name:string;label:string;options:any[]}){return <label><span className="form-label">{label}</span><select name={name} className="form-input">{options.map((option:any)=><option key={option[0]} value={option[0]}>{option[1]}</option>)}</select></label>}
