'use client';

import { useMemo, useState } from 'react';
import { Building2, CreditCard, FileText, Home, Landmark, Wrench } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

type Tab = 'HOME' | 'PROPERTIES' | 'FINANCE' | 'SETTLEMENTS' | 'DOCUMENTS' | 'MAINTENANCE';

export function OwnerPortalClient({ data }: { data: any }) {
  const [tab, setTab] = useState<Tab>('HOME');
  const recentPayments = useMemo(() => data.payments.slice(0, 10), [data.payments]);
  const recentSettlements = useMemo(() => data.settlements.slice(0, 6), [data.settlements]);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        <Nav active={tab === 'HOME'} onClick={() => setTab('HOME')} icon={<Home className="w-4 h-4" />} label="Inicio" />
        <Nav active={tab === 'PROPERTIES'} onClick={() => setTab('PROPERTIES')} icon={<Building2 className="w-4 h-4" />} label="Propiedades" />
        <Nav active={tab === 'FINANCE'} onClick={() => setTab('FINANCE')} icon={<CreditCard className="w-4 h-4" />} label="Ingresos/Gastos" />
        <Nav active={tab === 'SETTLEMENTS'} onClick={() => setTab('SETTLEMENTS')} icon={<Landmark className="w-4 h-4" />} label="Liquidaciones" />
        <Nav active={tab === 'DOCUMENTS'} onClick={() => setTab('DOCUMENTS')} icon={<FileText className="w-4 h-4" />} label="Documentos" />
        <Nav active={tab === 'MAINTENANCE'} onClick={() => setTab('MAINTENANCE')} icon={<Wrench className="w-4 h-4" />} label="Mantenimiento" />
      </div>

      {tab === 'HOME' && (
        <div className="space-y-6">
          <section className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><h2 className="text-xl font-black text-slate-900">Hola, {data.owner.name}</h2><p className="text-xs text-slate-500 mt-1">Resumen de tu cartera administrada por {data.owner.tenant.name}.</p></div>
            <div className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100"><p className="text-xs text-indigo-600 font-semibold">Liquidado históricamente</p><p className="text-xl font-black text-indigo-900">{formatCurrency(data.metrics.totalSettled)}</p></div>
          </section>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric label="Propiedades" value={data.metrics.properties} detail={`${data.metrics.occupied} ocupadas`} />
            <Metric label="Mantenimiento abierto" value={data.metrics.openMaintenance} detail="Órdenes en seguimiento" />
            <Metric label="Liquidaciones pendientes" value={data.metrics.pendingSettlements} detail="Borrador o listas" />
            <Metric label="Cobros registrados" value={formatCurrency(data.metrics.totalOwnerIncome)} detail="Participación sobre pagos visibles" />
          </div>
          <section className="grid lg:grid-cols-2 gap-4">
            <div className="card"><h3 className="title">Últimos cobros</h3><div className="mt-4 divide-y">{recentPayments.map((payment: any) => <PaymentRow key={payment.id} payment={payment} />)}{!recentPayments.length && <Empty text="No hay cobros registrados." />}</div></div>
            <div className="card"><h3 className="title">Últimas liquidaciones</h3><div className="mt-4 divide-y">{recentSettlements.map((settlement: any) => <SettlementRow key={settlement.id} settlement={settlement} />)}{!recentSettlements.length && <Empty text="No hay liquidaciones registradas." />}</div></div>
          </section>
        </div>
      )}

      {tab === 'PROPERTIES' && (
        <div className="grid lg:grid-cols-2 gap-4">
          {data.properties.map((property: any) => {
            const lease = property.propertyLeases[0];
            return <article key={property.id} className="card"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-bold">{property.code}</h3><Badge text={`${property.ownershipPercentage}%`} /></div><p className="text-xs text-slate-500 mt-1">{property.address}</p></div><Badge text={lease ? 'OCUPADA' : 'LIBRE'} success={!!lease} /></div><div className="grid grid-cols-2 gap-3 mt-4 text-xs"><Info label="Operación" value={property.operation} /><Info label="Estado" value={property.commercialStatus} /><Info label="Alquiler publicado" value={property.rentPrice == null ? '-' : formatCurrency(property.rentPrice)} /><Info label="Valor venta" value={property.salePrice == null ? '-' : formatCurrency(property.salePrice)} /></div>{lease && <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs"><p className="font-bold">Contrato vigente</p><p className="text-slate-500 mt-1">{lease.renter.firstName} {lease.renter.lastName}</p><p className="mt-2">Alquiler: <b>{formatCurrency(lease.currentRent)}</b> · hasta {formatDate(lease.endDate)}</p></div>}</article>;
          })}
        </div>
      )}

      {tab === 'FINANCE' && (
        <div className="space-y-6">
          <section className="card"><h3 className="title">Ingresos registrados</h3><p className="text-xs text-slate-500 mt-1">La participación se calcula según tu porcentaje de titularidad cargado en cada propiedad.</p><div className="mt-4 divide-y">{data.payments.map((payment: any) => <PaymentRow key={payment.id} payment={payment} />)}{!data.payments.length && <Empty text="No hay pagos asociados a tus propiedades." />}</div></section>
          <section className="card"><h3 className="title">Gastos de propiedades</h3><div className="mt-4 divide-y">{data.expenses.map((expense: any) => <div key={expense.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><b className="text-sm">{expense.description}</b><p className="text-xs text-slate-500">{expense.property.code} · {expense.category} · {expense.status}</p></div><div className="sm:text-right"><p className="font-bold">{formatCurrency(expense.ownerShare)}</p><p className="text-[11px] text-slate-400">Gasto total {formatCurrency(expense.amount)}</p></div></div>)}{!data.expenses.length && <Empty text="No hay gastos registrados." />}</div></section>
        </div>
      )}

      {tab === 'SETTLEMENTS' && (
        <div className="space-y-4">
          {data.settlements.map((settlement: any) => <article key={settlement.id} className="card"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-bold">{formatDate(settlement.periodStart)} → {formatDate(settlement.periodEnd)}</h3><Badge text={settlement.status} success={settlement.status === 'PAID'} /></div>{settlement.paidAt && <p className="text-xs text-slate-500 mt-1">Pagada {formatDate(settlement.paidAt)}</p>}</div><p className="text-xl font-black">{formatCurrency(settlement.netAmount)}</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs"><Info label="Cobrado" value={formatCurrency(settlement.grossCollected)} /><Info label="Gastos" value={formatCurrency(settlement.expensesTotal)} /><Info label="Comisión" value={formatCurrency(settlement.commissionTotal)} /><Info label="Impuestos" value={formatCurrency(settlement.taxesTotal)} /></div>{settlement.lines.length > 0 && <div className="mt-4 border-t pt-3 space-y-1">{settlement.lines.map((line: any) => <div key={line.id} className="flex justify-between text-xs"><span>{line.property ? `${line.property.code} · ` : ''}{line.description}</span><b>{formatCurrency(line.amount)}</b></div>)}</div>}</article>)}
          {!data.settlements.length && <Empty text="Todavía no hay liquidaciones." />}
        </div>
      )}

      {tab === 'DOCUMENTS' && (
        <section className="card"><h3 className="title">Documentos de tus propiedades</h3><div className="mt-4 divide-y">{data.documents.map((document: any) => <div key={document.id} className="py-3 flex items-center justify-between gap-3"><div><b className="text-sm">{document.fileName}</b><p className="text-xs text-slate-500">{document.property?.code || 'General'} · {document.category} · {formatDate(document.uploadedAt)}</p></div><a href={document.fileUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-indigo-600">Abrir</a></div>)}{!data.documents.length && <Empty text="No hay documentos compartidos." />}</div></section>
      )}

      {tab === 'MAINTENANCE' && (
        <div className="space-y-4">{data.maintenance.map((request: any) => <article key={request.id} className="card"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-bold">{request.title}</h3><Badge text={request.status} success={request.status === 'RESOLVED'} /></div><p className="text-xs text-slate-500 mt-1">{request.property.code} · {request.property.address}</p></div><p className="text-xs font-bold">{request.priority}</p></div><p className="text-sm text-slate-700 mt-3">{request.description}</p><div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs"><Info label="Proveedor" value={request.provider ? request.provider.companyName || `${request.provider.firstName} ${request.provider.lastName}` : 'Sin asignar'} /><Info label="Presupuesto" value={request.quotedAmount == null ? '-' : formatCurrency(request.quotedAmount)} /><Info label="Costo real" value={request.actualCost == null ? '-' : formatCurrency(request.actualCost)} /></div></article>)}{!data.maintenance.length && <Empty text="No hay mantenimientos asociados a tus propiedades." />}</div>
      )}

      <style jsx>{`.card{background:white;border:1px solid #e2e8f0;border-radius:1rem;padding:1.5rem}.title{font-size:.95rem;font-weight:700;color:#0f172a}`}</style>
    </div>
  );
}

function Nav({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button onClick={onClick} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{icon}{label}</button>; }
function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) { return <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-xl font-black mt-1">{value}</p><p className="text-[11px] text-slate-400 mt-1">{detail}</p></div>; }
function Badge({ text, success = false }: { text: string; success?: boolean }) { return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${success ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{text}</span>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-slate-400">{label}</p><p className="font-semibold text-slate-700 mt-0.5">{value}</p></div>; }
function PaymentRow({ payment }: { payment: any }) { const lease = payment.debt.propertyLease; return <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><b className="text-sm">{lease?.property?.code || 'Propiedad'} · {payment.debt.description}</b><p className="text-xs text-slate-500">{formatDate(payment.paidAt)}{lease?.renter ? ` · ${lease.renter.firstName} ${lease.renter.lastName}` : ''}</p></div><div className="sm:text-right"><p className="font-bold text-emerald-600">{formatCurrency(payment.ownerShare)}</p><p className="text-[11px] text-slate-400">Pago {formatCurrency(payment.amount)} · participación {payment.ownershipPercentage}%</p></div></div>; }
function SettlementRow({ settlement }: { settlement: any }) { return <div className="py-3 flex items-center justify-between gap-3"><div><b className="text-sm">{formatDate(settlement.periodStart)} → {formatDate(settlement.periodEnd)}</b><p className="text-xs text-slate-500">{settlement.status}{settlement.paidAt ? ` · ${formatDate(settlement.paidAt)}` : ''}</p></div><b>{formatCurrency(settlement.netAmount)}</b></div>; }
function Empty({ text }: { text: string }) { return <div className="py-8 text-center text-sm text-slate-400">{text}</div>; }
