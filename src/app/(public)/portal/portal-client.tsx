'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  FileText,
  Home,
  MessageSquare,
  Plus,
  UserRound,
  Wrench,
} from 'lucide-react';
import { createRenterMaintenanceRequestAction, updateRenterPortalProfileAction } from '@/actions/renter-portal';
import { formatCurrency, formatDate } from '@/lib/utils';

type PortalTab = 'HOME' | 'ACCOUNT' | 'DOCUMENTS' | 'MAINTENANCE' | 'PROFILE';

export function RenterPortalClient({ data }: { data: any }) {
  const [tab, setTab] = useState<PortalTab>('HOME');
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const pendingDebts = useMemo(() => data.debts.filter((debt: any) => debt.status !== 'PAID'), [data.debts]);
  const totalPending = pendingDebts.reduce((sum: number, debt: any) => sum + Math.max(0, debt.amount - debt.paidAmount), 0);
  const openMaintenance = data.maintenanceRequests.filter((request: any) => !['RESOLVED', 'CANCELED'].includes(request.status));

  function run(task: () => Promise<any>, success: string) {
    setError('');
    setMessage('');
    startTransition(async () => {
      try {
        await task();
        setMessage(success);
        window.location.reload();
      } catch (err: any) {
        setError(err?.message || 'No se pudo completar la operación.');
      }
    });
  }

  function submitMaintenance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => createRenterMaintenanceRequestAction({
      propertyId: String(form.get('propertyId') || ''),
      category: String(form.get('category') || ''),
      priority: String(form.get('priority') || 'NORMAL') as any,
      title: String(form.get('title') || ''),
      description: String(form.get('description') || ''),
    }), 'Solicitud enviada.');
  }

  function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => updateRenterPortalProfileAction({
      email: String(form.get('email') || '') || null,
      phone: String(form.get('phone') || '') || null,
      address: String(form.get('address') || '') || null,
    }), 'Datos actualizados.');
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
        <PortalNav active={tab === 'HOME'} onClick={() => setTab('HOME')} icon={<Home className="w-4 h-4" />} label="Inicio" />
        <PortalNav active={tab === 'ACCOUNT'} onClick={() => setTab('ACCOUNT')} icon={<CreditCard className="w-4 h-4" />} label="Cuenta" />
        <PortalNav active={tab === 'DOCUMENTS'} onClick={() => setTab('DOCUMENTS')} icon={<FileText className="w-4 h-4" />} label="Documentos" />
        <PortalNav active={tab === 'MAINTENANCE'} onClick={() => setTab('MAINTENANCE')} icon={<Wrench className="w-4 h-4" />} label="Mantenimiento" />
        <PortalNav active={tab === 'PROFILE'} onClick={() => setTab('PROFILE')} icon={<UserRound className="w-4 h-4" />} label="Mis datos" />
      </div>

      {error && <div className="mb-4 p-3 rounded-xl border border-rose-100 bg-rose-50 text-sm text-rose-700">{error}</div>}
      {message && <div className="mb-4 p-3 rounded-xl border border-emerald-100 bg-emerald-50 text-sm text-emerald-700">{message}</div>}

      {tab === 'HOME' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Hola, {data.renter.firstName} 👋</h2>
              <p className="text-xs text-slate-500 mt-1">DNI: <span className="font-mono font-semibold text-slate-700">{data.renter.dni}</span></p>
            </div>
            <div className="w-full sm:w-auto p-4 bg-slate-50 rounded-xl border border-slate-100 sm:text-right">
              <span className="text-xs font-semibold text-slate-500 block">Saldo pendiente</span>
              <span className={`text-2xl font-black font-mono block ${totalPending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(totalPending)}</span>
            </div>
          </section>

          <div className="grid md:grid-cols-3 gap-4">
            <PortalMetric label="Próximo vencimiento" value={data.nextDue ? formatDate(data.nextDue.dueDate) : 'Sin vencimientos'} detail={data.nextDue ? `${data.nextDue.description} · ${formatCurrency(data.nextDue.amount)}` : 'Cuenta al día'} />
            <PortalMetric label="Mantenimientos abiertos" value={String(openMaintenance.length)} detail="Solicitudes en seguimiento" />
            <PortalMetric label="Documentos" value={String(data.documents.length)} detail="Disponibles en tu portal" />
          </div>

          <section className="card">
            <h3 className="title"><FileText className="w-4 h-4 text-indigo-600" /> Mis contratos vigentes</h3>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {data.propertyLeases.map((lease: any) => (
                <div key={lease.id} className="subcard">
                  <div className="flex justify-between gap-2"><b>{lease.property.code}</b><Status text={lease.status} /></div>
                  <p className="text-xs text-slate-500 mt-1">{lease.property.address}</p>
                  <div className="mt-3 pt-3 border-t text-xs space-y-1"><p>Alquiler: <b>{formatCurrency(lease.currentRent)}/mes</b></p><p>Vigencia: {formatDate(lease.startDate)} → {formatDate(lease.endDate)}</p>{lease.nextAdjustmentDate && <p>Próximo ajuste: {formatDate(lease.nextAdjustmentDate)}</p>}</div>
                </div>
              ))}
              {data.garageLeases.map((lease: any) => (
                <div key={lease.id} className="subcard">
                  <div className="flex justify-between gap-2"><b>Cochera</b><Status text={lease.status} /></div>
                  <p className="text-xs text-slate-500 mt-1">Plazas {lease.spaces.map((item: any) => item.space.spaceNumber).join(', ')}</p>
                  <div className="mt-3 pt-3 border-t text-xs space-y-1"><p>Total: <b>{formatCurrency(lease.totalRent)}/mes</b></p><p>Vigencia: {formatDate(lease.startDate)} → {formatDate(lease.endDate)}</p></div>
                </div>
              ))}
              {!data.propertyLeases.length && !data.garageLeases.length && <Empty text="No tenés contratos vigentes." />}
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <div className="card"><h3 className="title"><Bell className="w-4 h-4 text-indigo-600" /> Próximos eventos</h3><div className="mt-4">{data.nextDue ? <div className="flex gap-3"><AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" /><div><p className="text-sm font-semibold">{data.nextDue.description}</p><p className="text-xs text-slate-500">Vence {formatDate(data.nextDue.dueDate)} · {formatCurrency(data.nextDue.amount)}</p></div></div> : <p className="text-sm text-slate-500">No tenés vencimientos próximos.</p>}</div></div>
            <div className="card"><h3 className="title"><MessageSquare className="w-4 h-4 text-indigo-600" /> Comunicaciones</h3><p className="text-sm text-slate-500 mt-4">Las notificaciones y mensajes de la inmobiliaria aparecerán acá cuando se active el bloque de comunicación de Fase 3.</p></div>
          </section>
        </div>
      )}

      {tab === 'ACCOUNT' && (
        <div className="space-y-6">
          <section className="card">
            <div className="flex items-center justify-between"><div><h3 className="title"><CreditCard className="w-4 h-4 text-indigo-600" /> Cuenta corriente</h3><p className="text-xs text-slate-500 mt-1">Deudas, vencimientos y saldos.</p></div><span className="text-xl font-black text-slate-900">{formatCurrency(totalPending)}</span></div>
            <div className="mt-4 divide-y">
              {data.debts.map((debt: any) => {
                const balance = Math.max(0, debt.amount - debt.paidAmount);
                return <div key={debt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><div className="flex items-center gap-2"><b className="text-sm">{debt.description}</b><Status text={debt.status} /></div><p className="text-xs text-slate-500 mt-1">Vence {formatDate(debt.dueDate)}</p></div><div className="sm:text-right"><p className="text-sm font-bold">{formatCurrency(balance)}</p><p className="text-[11px] text-slate-400">Total {formatCurrency(debt.amount)} · Pagado {formatCurrency(debt.paidAmount)}</p></div></div>;
              })}
              {!data.debts.length && <Empty text="No hay movimientos en tu cuenta corriente." />}
            </div>
          </section>

          <section className="card">
            <h3 className="title">Pagos y recibos</h3>
            <div className="mt-4 divide-y">
              {data.payments.map((payment: any) => <div key={payment.id} className="py-3 flex items-center justify-between gap-3"><div><b className="text-sm">{payment.debt.description}</b><p className="text-xs text-slate-500">{formatDate(payment.paidAt)} · {payment.method}</p></div><div className="text-right"><p className="font-bold text-emerald-600">{formatCurrency(payment.amount)}</p><p className="text-[11px] text-slate-400">{payment.receiptNumber ? `Recibo #${payment.receiptNumber}` : 'Recibo pendiente'}</p></div></div>)}
              {!data.payments.length && <Empty text="Todavía no tenés pagos registrados." />}
            </div>
          </section>
        </div>
      )}

      {tab === 'DOCUMENTS' && (
        <section className="card">
          <h3 className="title"><FileText className="w-4 h-4 text-indigo-600" /> Mis documentos</h3>
          <p className="text-xs text-slate-500 mt-1">Contratos, comprobantes y documentación compartida por la inmobiliaria.</p>
          <div className="mt-4 divide-y">
            {data.documents.map((document: any) => <div key={document.id} className="py-3 flex items-center justify-between gap-3"><div><b className="text-sm">{document.fileName}</b><p className="text-xs text-slate-500">{document.category} · {formatDate(document.uploadedAt)}</p></div><a href={document.fileUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-indigo-600">Abrir</a></div>)}
            {!data.documents.length && <Empty text="No hay documentos compartidos." />}
          </div>
        </section>
      )}

      {tab === 'MAINTENANCE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Mantenimiento</h3><p className="text-xs text-slate-500">Reportá un problema y seguí su estado.</p></div><button onClick={() => setShowMaintenanceForm((value) => !value)} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"><Plus className="w-4 h-4" /> Nueva solicitud</button></div>
          {showMaintenanceForm && <form onSubmit={submitMaintenance} className="card grid md:grid-cols-2 gap-3"><Select name="propertyId" label="Propiedad *" options={data.propertyLeases.map((lease: any) => [lease.property.id, `${lease.property.code} · ${lease.property.address}`])} /><Select name="priority" label="Prioridad" options={[['LOW', 'Baja'], ['NORMAL', 'Normal'], ['HIGH', 'Alta'], ['URGENT', 'Urgente']]} /><Field name="category" label="Categoría *" placeholder="Plomería, electricidad..." /><Field name="title" label="Título *" placeholder="Pérdida debajo de la pileta" /><TextArea name="description" label="Detalle *" className="md:col-span-2" rows={5} /><div className="md:col-span-2 flex justify-end"><button disabled={isPending || !data.propertyLeases.length} className="submit">Enviar solicitud</button></div></form>}
          <div className="space-y-3">
            {data.maintenanceRequests.map((request: any) => <article key={request.id} className="card"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><div className="flex items-center gap-2"><b>{request.title}</b><Status text={request.status} /><Priority text={request.priority} /></div><p className="text-xs text-slate-500 mt-1">{request.property.code} · {request.property.address}</p></div><span className="text-xs text-slate-400">{formatDate(request.createdAt)}</span></div><p className="text-sm text-slate-700 mt-3">{request.description}</p>{request.provider && <p className="text-xs text-slate-500 mt-2">Proveedor: {request.provider.companyName || `${request.provider.firstName} ${request.provider.lastName}`}</p>}{request.events?.length > 0 && <div className="mt-4 border-t pt-3"><p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Seguimiento</p>{request.events.map((event: any) => <p key={event.id} className="text-xs text-slate-500 mb-1">{formatDate(event.createdAt)} · {event.toStatus || 'Actualización'}{event.note ? ` · ${event.note}` : ''}</p>)}</div>}</article>)}
            {!data.maintenanceRequests.length && <Empty text="No tenés solicitudes de mantenimiento." />}
          </div>
        </div>
      )}

      {tab === 'PROFILE' && (
        <section className="card">
          <h3 className="title"><UserRound className="w-4 h-4 text-indigo-600" /> Mis datos</h3>
          <p className="text-xs text-slate-500 mt-1">Podés actualizar tus datos de contacto. El DNI se administra desde la inmobiliaria.</p>
          <form onSubmit={submitProfile} className="grid md:grid-cols-2 gap-3 mt-5"><Field name="email" label="Email" type="email" defaultValue={data.renter.email || ''} /><Field name="phone" label="Teléfono" defaultValue={data.renter.phone || ''} /><Field name="address" label="Domicilio" defaultValue={data.renter.address || ''} className="md:col-span-2" /><div className="md:col-span-2 flex justify-end"><button disabled={isPending} className="submit">Guardar cambios</button></div></form>
        </section>
      )}

      <style jsx>{`.card{background:white;border:1px solid #e2e8f0;border-radius:1rem;padding:1.5rem}.subcard{padding:1rem;background:#f8fafc;border:1px solid #f1f5f9;border-radius:.75rem}.title{display:flex;align-items:center;gap:.5rem;font-size:.95rem;font-weight:700;color:#0f172a}.submit{background:#4f46e5;color:#fff;border-radius:.5rem;padding:.6rem 1rem;font-size:.8rem;font-weight:700}`}</style>
    </>
  );
}

function PortalNav({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button onClick={onClick} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{icon}{label}</button>;
}
function PortalMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-xl font-black text-slate-900 mt-1">{value}</p><p className="text-[11px] text-slate-400 mt-1">{detail}</p></div>;
}
function Field({ name, label, type = 'text', placeholder, defaultValue, className = '' }: { name: string; label: string; type?: string; placeholder?: string; defaultValue?: string; className?: string }) {
  return <label className={className}><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></label>;
}
function TextArea({ name, label, rows = 3, className = '' }: { name: string; label: string; rows?: number; className?: string }) {
  return <label className={className}><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><textarea name={name} rows={rows} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></label>;
}
function Select({ name, label, options }: { name: string; label: string; options: any[] }) {
  return <label><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><select name={name} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">{options.map((option: any) => <option key={option[0]} value={option[0]}>{option[1]}</option>)}</select></label>;
}
function Status({ text }: { text: string }) {
  return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{text}</span>;
}
function Priority({ text }: { text: string }) {
  const urgent = text === 'URGENT';
  const high = text === 'HIGH';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${urgent ? 'bg-rose-100 text-rose-700' : high ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{text}</span>;
}
function Empty({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-slate-400"><CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-slate-300" />{text}</div>;
}
