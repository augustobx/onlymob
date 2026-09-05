'use client';

import { useMemo, useState } from 'react';
import { Building2, CreditCard, FileText, Home, Landmark, MessageSquare, Wrench } from 'lucide-react';
import { PortalCommunications } from '@/components/portal/portal-communications';
import { formatCurrency, formatDate } from '@/lib/utils';

type Tab = 'HOME' | 'PROPERTIES' | 'FINANCE' | 'SETTLEMENTS' | 'DOCUMENTS' | 'MAINTENANCE' | 'COMMUNICATIONS';

export function OwnerPortalClient({ data }: { data: any }) {
  const [tab, setTab] = useState<Tab>('HOME');
  const recentPayments = useMemo(() => data.payments.slice(0, 10), [data.payments]);
  const recentSettlements = useMemo(() => data.settlements.slice(0, 6), [data.settlements]);
  const unreadCommunications = (data.communications || []).filter((item: any) => !item.readAt).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
        <Nav active={tab === 'HOME'} onClick={() => setTab('HOME')} icon={<Home className="w-4 h-4" />} label="Inicio" />
        <Nav active={tab === 'PROPERTIES'} onClick={() => setTab('PROPERTIES')} icon={<Building2 className="w-4 h-4" />} label="Propiedades" />
        <Nav active={tab === 'FINANCE'} onClick={() => setTab('FINANCE')} icon={<CreditCard className="w-4 h-4" />} label="Ingresos/Gastos" />
        <Nav active={tab === 'SETTLEMENTS'} onClick={() => setTab('SETTLEMENTS')} icon={<Landmark className="w-4 h-4" />} label="Liquidaciones" />
        <Nav active={tab === 'DOCUMENTS'} onClick={() => setTab('DOCUMENTS')} icon={<FileText className="w-4 h-4" />} label="Documentos" />
        <Nav active={tab === 'MAINTENANCE'} onClick={() => setTab('MAINTENANCE')} icon={<Wrench className="w-4 h-4" />} label="Mantenimiento" />
        <Nav active={tab === 'COMMUNICATIONS'} onClick={() => setTab('COMMUNICATIONS')} icon={<MessageSquare className="w-4 h-4" />} label={`Mensajes${unreadCommunications ? ` (${unreadCommunications})` : ''}`} />
      </div>

      {tab === 'HOME' && (
        <div className="space-y-5">
          <section className="portal-panel flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div><p className="text-xs uppercase tracking-[.16em] font-bold text-indigo-600">Mi cartera</p><h2 className="text-2xl font-black text-slate-950 mt-1">Hola, {data.owner.name}</h2><p className="text-sm text-slate-500 mt-1">Resumen administrado por {data.owner.tenant.name}.</p></div>
            <div className="rounded-2xl bg-slate-950 text-white p-4 min-w-56"><p className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">Liquidado históricamente</p><p className="text-2xl font-black text-emerald-300 mt-1">{formatCurrency(data.metrics.totalSettled)}</p></div>
          </section>
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <Metric label="Propiedades" value={data.metrics.properties} detail={`${data.metrics.occupied} ocupadas`} />
            <Metric label="Mantenimiento" value={data.metrics.openMaintenance} detail="Órdenes abiertas" />
            <Metric label="Liquidaciones" value={data.metrics.pendingSettlements} detail="Pendientes" />
            <Metric label="Cobros" value={formatCurrency(data.metrics.totalOwnerIncome)} detail="Participación registrada" />
            <Metric label="Mensajes nuevos" value={unreadCommunications} detail="Comunicaciones" />
          </div>
          <section className="grid lg:grid-cols-2 gap-4">
            <div className="portal-panel"><h3 className="portal-title">Últimos cobros</h3><div className="mt-4 divide-y divide-slate-100">{recentPayments.map((payment: any) => <PaymentRow key={payment.id} payment={payment} />)}{!recentPayments.length && <Empty text="No hay cobros registrados." />}</div></div>
            <div className="portal-panel"><h3 className="portal-title">Últimas liquidaciones</h3><div className="mt-4 divide-y divide-slate-100">{recentSettlements.map((settlement: any) => <SettlementRow key={settlement.id} settlement={settlement} />)}{!recentSettlements.length && <Empty text="No hay liquidaciones registradas." />}</div></div>
          </section>
        </div>
      )}

      {tab === 'PROPERTIES' && (
        <div className="grid lg:grid-cols-2 gap-4">
          {data.properties.map((property: any) => {
            const lease = property.propertyLeases[0];
            return <article key={property.id} className="portal-panel"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-bold">{property.code}</h3><Badge text={`${property.ownershipPercentage}%`} /></div><p className="text-xs text-slate-500 mt-1">{property.address}</p></div><Badge text={lease ? 'OCUPADA' : 'LIBRE'} success={!!lease} /></div><div className="grid grid-cols-2 gap-3 mt-4 text-xs"><Info label="Operación" value={property.operation} /><Info label="Estado" value={property.commercialStatus} /><Info label="Alquiler publicado" value={property.rentPrice == null ? '-' : formatCurrency(property.rentPrice)} /><Info label="Valor venta" value={property.salePrice == null ? '-' : formatCurrency(property.salePrice)} /></div>{lease && <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs"><p className="font-bold">Contrato vigente</p><p className="text-slate-500 mt-1">{lease.renter.firstName} {lease.renter.lastName}</p><p className="mt-2">Alquiler: <b>{formatCurrency(lease.currentRent)}</b> · hasta {formatDate(lease.endDate)}</p></div>}</article>;
          })}
          {!data.properties.length && <Empty text="No hay propiedades asociadas." />}
        </div>
      )}

      {tab === 'FINANCE' && (
        <div className="space-y-5">
          <section className="portal-panel"><h3 className="portal-title">Ingresos registrados</h3><p className="text-xs text-slate-500 mt-1">Participación según el porcentaje de titularidad de cada propiedad.</p><div className="mt-4 divide-y divide-slate-100">{data.payments.map((payment: any) => <PaymentRow key={payment.id} payment={payment} />)}{!data.payments.length && <Empty text="No hay pagos asociados a tus propiedades." />}</div></section>
          <section className="portal-panel"><h3 className="portal-title">Gastos de propiedades</h3><div className="mt-4 divide-y divide-slate-100">{data.expenses.map((expense: any) => <div key={expense.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><b className="text-sm">{expense.description}</b><p className="text-xs text-slate-500">{expense.property.code} · {expense.category} · {expense.status}</p></div><div className="sm:text-right"><p className="font-bold">{formatCurrency(expense.ownerShare)}</p><p className="text-[11px] text-slate-400">Gasto total {formatCurrency(expense.amount)}</p></div></div>)}{!data.expenses.length && <Empty text="No hay gastos registrados." />}</div></section>
        </div>
      )}

      {tab === 'SETTLEMENTS' && (
        <div className="space-y-4">
          {data.settlements.map((settlement: any) => <article key={settlement.id} className="portal-panel"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-bold">{formatDate(settlement.periodStart)} → {formatDate(settlement.periodEnd)}</h3><Badge text={settlement.status} success={settlement.status === 'PAID'} /></div>{settlement.paidAt && <p className="text-xs text-slate-500 mt-1">Pagada {formatDate(settlement.paidAt)}</p>}</div><p className="text-xl font-black">{formatCurrency(settlement.netAmount)}</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs"><Info label="Cobrado" value={formatCurrency(settlement.grossCollected)} /><Info label="Gastos" value={formatCurrency(settlement.expensesTotal)} /><Info label="Comisión" value={formatCurrency(settlement.commissionTotal)} /><Info label="Impuestos" value={formatCurrency(settlement.taxesTotal)} /></div>{settlement.lines.length > 0 && <div className="mt-4 border-t pt-3 space-y-1">{settlement.lines.map((line: any) => <div key={line.id} className="flex justify-between text-xs"><span>{line.property ? `${line.property.code} · ` : ''}{line.description}</span><b>{formatCurrency(line.amount)}</b></div>)}</div>}</article>)}
          {!data.settlements.length && <Empty text="Todavía no hay liquidaciones." />}
        </div>
      )}

      {tab === 'DOCUMENTS' && (
        <section className="portal-panel"><h3 className="portal-title">Documentos de tus propiedades</h3><div className="mt-4 divide-y divide-slate-100">{data.documents.map((document: any) => <div key={document.id} className="py-3 flex items-center justify-between gap-3"><div><b className="text-sm">{document.fileName}</b><p className="text-xs text-slate-500">{document.property?.code || 'General'} · {document.category} · {formatDate(document.uploadedAt)}</p></div><a href={document.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary">Abrir</a></div>)}{!data.documents.length && <Empty text="No hay documentos compartidos." />}</div></section>
      )}

      {tab === 'MAINTENANCE' && (
        <div className="space-y-4">{data.maintenance.map((request: any) => <article key={request.id} className="portal-panel"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-bold">{request.title}</h3><Badge text={request.status} success={request.status === 'RESOLVED'} /></div><p className="text-xs text-slate-500 mt-1">{request.property.code} · {request.property.address}</p></div><p className="text-xs font-bold">{request.priority}</p></div><p className="text-sm text-slate-700 mt-3">{request.description}</p><div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs"><Info label="Proveedor" value={request.provider ? request.provider.companyName || `${request.provider.firstName} ${request.provider.lastName}` : 'Sin asignar'} /><Info label="Presupuesto" value={request.quotedAmount == null ? '-' : formatCurrency(request.quotedAmount)} /><Info label="Costo real" value={request.actualCost == null ? '-' : formatCurrency(request.actualCost)} /></div></article>)}{!data.maintenance.length && <Empty text="No hay mantenimientos asociados a tus propiedades." />}</div>
      )}

      {tab === 'COMMUNICATIONS' && <PortalCommunications messages={data.communications || []} audience="OWNER" />}
    </div>
  );
}

function Nav({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button onClick={onClick} className={`portal-nav-button ${active ? 'portal-nav-button--active' : ''}`}>{icon}<span>{label}</span></button>; }
function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) { return <div className="portal-panel !p-4"><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">{label}</p><p className="text-xl font-black mt-1 text-slate-950">{value}</p><p className="text-[11px] text-slate-500 mt-1">{detail}</p></div>; }
function Badge({ text, success = false }: { text: string; success?: boolean }) { return <span className={`status-pill ${success ? 'status-pill--success' : 'status-pill--neutral'}`}>{text}</span>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-slate-400">{label}</p><p className="font-semibold text-slate-700 mt-0.5">{value}</p></div>; }
function PaymentRow({ payment }: { payment: any }) { const lease = payment.debt.propertyLease; return <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><b className="text-sm">{lease?.property?.code || 'Propiedad'} · {payment.debt.description}</b><p className="text-xs text-slate-500">{formatDate(payment.paidAt)}{lease?.renter ? ` · ${lease.renter.firstName} ${lease.renter.lastName}` : ''}</p></div><div className="sm:text-right"><p className="font-bold text-emerald-600">{formatCurrency(payment.ownerShare)}</p><p className="text-[11px] text-slate-400">Pago {formatCurrency(payment.amount)} · participación {payment.ownershipPercentage}%</p></div></div>; }
function SettlementRow({ settlement }: { settlement: any }) { return <div className="py-3 flex items-center justify-between gap-3"><div><b className="text-sm">{formatDate(settlement.periodStart)} → {formatDate(settlement.periodEnd)}</b><p className="text-xs text-slate-500">{settlement.status}{settlement.paidAt ? ` · ${formatDate(settlement.paidAt)}` : ''}</p></div><b>{formatCurrency(settlement.netAmount)}</b></div>; }
function Empty({ text }: { text: string }) { return <div className="empty-state">{text}</div>; }
