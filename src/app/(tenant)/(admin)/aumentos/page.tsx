import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { getRentAdjustmentScheduleAction } from '@/actions/rent-adjustments';
import { formatCurrency, formatDate } from '@/lib/utils';
import { adjustmentDisplayLabel } from '@/lib/lease-labels';
import { ArrowLeft, ArrowUpRight, CalendarClock, Clock3, FileText, Home, TriangleAlert } from 'lucide-react';
import { DataTable, EmptyState, StatusPill } from '@/components/entity-360/entity-360-ui';
import { BulkAdjustmentsClient } from './bulk-adjustments-client';

export const dynamic = 'force-dynamic';

function bucketClass(key: string, count: number, firstMonthKey?: string) {
  if (key === 'atrasados') return count > 0
    ? 'border-rose-200 bg-rose-50 text-rose-950'
    : 'border-slate-200 bg-white text-slate-700';
  if (key === firstMonthKey) return count > 0
    ? 'border-amber-200 bg-amber-50 text-amber-950'
    : 'border-slate-200 bg-white text-slate-700';
  return count > 0
    ? 'border-indigo-200 bg-indigo-50/70 text-indigo-950'
    : 'border-slate-200 bg-white text-slate-700';
}

function dueLabel(daysUntil: number) {
  if (daysUntil < 0) return `Vencido hace ${Math.abs(daysUntil)} día${Math.abs(daysUntil) === 1 ? '' : 's'}`;
  if (daysUntil === 0) return 'Aumenta hoy';
  if (daysUntil <= 7) return `En ${daysUntil} día${daysUntil === 1 ? '' : 's'}`;
  return `En ${daysUntil} días`;
}

export default async function RentAdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const [{ mes }, schedule] = await Promise.all([
    searchParams,
    getRentAdjustmentScheduleAction(),
  ]);

  const defaultMonth = schedule.months[0]?.key || '';
  const selectedKey = mes === 'atrasados' || schedule.months.some((item) => item.key === mes)
    ? mes!
    : defaultMonth;
  const buckets = [schedule.overdue, ...schedule.months];
  const selectedBucket = buckets.find((item) => item.key === selectedKey) || schedule.months[0];
  const selectedItems = schedule.items
    .filter((item) => selectedKey === 'atrasados'
      ? item.isOverdue
      : !item.isOverdue && item.dueMonth === selectedKey)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div>
      <Header
        title="Calendario de aumentos"
        subtitle="Contratos agrupados por mes según su próximo ajuste"
        actionButton={
          <Link href="/dashboard" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        }
      />

      <main className="app-page">
        <div className="page-container space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-900 p-6 text-white shadow-xl shadow-slate-900/10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-200">
                  <CalendarClock className="w-4 h-4" /> Agenda contractual
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">{selectedBucket?.label || 'Aumentos'}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Acá están los inquilinos cuyo alquiler debe actualizarse en el período seleccionado.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Contratos</span>
                  <strong className="mt-1 block text-3xl font-black">{selectedItems.length}</strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Alquiler actual</span>
                  <strong className="mt-1 block text-lg font-black">{formatCurrency(selectedItems.reduce((sum, item) => sum + item.currentRent, 0))}</strong>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Resumen por mes</h3>
                <p className="text-xs text-slate-500">Seleccioná un período para ver quién debe recibir aumento.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              {buckets.map((bucket) => (
                <Link
                  key={bucket.key}
                  href={`/aumentos?mes=${bucket.key}`}
                  className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${bucketClass(bucket.key, bucket.count, defaultMonth)} ${selectedKey === bucket.key ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                >
                  <span className="block text-[10px] font-black uppercase tracking-wider opacity-60">{bucket.key === 'atrasados' ? 'Pendientes' : 'Período'}</span>
                  <strong className="mt-1 block text-sm font-black">{bucket.label}</strong>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      <span className="text-3xl font-black leading-none">{bucket.count}</span>
                      <span className="ml-1 text-[10px] font-bold opacity-60">contratos</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 opacity-50" />
                  </div>
                  <p className="mt-3 truncate text-[11px] font-bold opacity-70">{formatCurrency(bucket.totalRent)} actuales</p>
                </Link>
              ))}
            </div>
          </section>

          <BulkAdjustmentsClient
            items={selectedItems}
            groupLabel={selectedBucket?.label || 'Aumentos'}
            globalAutoEnabled={schedule.globalAutoEnabled}
          />

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {selectedKey === 'atrasados'
                    ? <TriangleAlert className="w-5 h-5 text-rose-500" />
                    : <Clock3 className="w-5 h-5 text-indigo-500" />}
                  <h3 className="font-black text-slate-900">{selectedBucket?.label}</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">Detalle de contratos que requieren actualización.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {selectedItems.length} {selectedItems.length === 1 ? 'inquilino' : 'inquilinos'}
              </span>
            </div>

            <div className="p-4">
              {selectedItems.length ? (
                <DataTable
                  headers={['Fecha', 'Inquilino', 'Propiedad', 'Alquiler actual', 'Ajuste', 'Periodicidad', 'Auto', 'Estado', 'Acciones']}
                  rows={selectedItems.map((item) => [
                    <div key="fecha">
                      <p className={`font-black ${item.isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>{formatDate(new Date(item.dueDate))}</p>
                      <p className={`text-[10px] font-bold ${item.isOverdue ? 'text-rose-500' : item.daysUntil <= 7 ? 'text-amber-600' : 'text-slate-400'}`}>{dueLabel(item.daysUntil)}</p>
                    </div>,
                    <div key="inquilino">
                      <p className="font-bold text-slate-900">{item.renterName}</p>
                      <p className="text-[10px] font-mono text-slate-400">DNI {item.renterDni}</p>
                    </div>,
                    <Link key="propiedad" href={`/propiedades/${item.propertyId}`} className="block font-semibold text-indigo-600 hover:text-indigo-800">
                      <span className="block">{item.propertyCode}</span>
                      <span className="block max-w-[230px] truncate text-[10px] font-medium text-slate-500">{item.propertyAddress}</span>
                    </Link>,
                    <span key="alquiler" className="font-mono font-black text-slate-900">{formatCurrency(item.currentRent)}</span>,
                    <div key="ajuste">
                      <p className="font-semibold text-slate-700">{adjustmentDisplayLabel(item.adjustmentIndex, item.adjustmentMethod)}</p>
                      <p className="text-[10px] text-slate-400">{item.inferred ? 'Fecha estimada según contrato' : 'Fecha programada'}</p>
                    </div>,
                    <span key="periodicidad" className="font-semibold text-slate-600">Cada {item.updatePeriodMonths} meses</span>,
                    <StatusPill key="auto" tone={item.autoAdjustmentEnabled ? 'success' : 'neutral'}>
                      {item.autoAdjustmentEnabled ? 'AUTO' : 'MANUAL'}
                    </StatusPill>,
                    <StatusPill key="estado" tone={item.isOverdue ? 'danger' : item.daysUntil <= 30 ? 'warning' : 'info'}>
                      {item.isOverdue ? 'AUMENTO PENDIENTE' : item.daysUntil <= 30 ? 'PRÓXIMO' : 'PROGRAMADO'}
                    </StatusPill>,
                    <div key="acciones" className="flex flex-wrap gap-2">
                      <Link href={`/propiedades/${item.propertyId}#aumentos`} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700">
                        <Home className="w-3 h-3" /> Aplicar aumento
                      </Link>
                      <Link href={`/contratos/${item.leaseId}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200">
                        <FileText className="w-3 h-3" /> Contrato
                      </Link>
                    </div>,
                  ])}
                />
              ) : (
                <EmptyState>No hay contratos con aumento previsto para este período.</EmptyState>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
