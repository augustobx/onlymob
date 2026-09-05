import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { getAnalyticsAction } from '@/actions/analytics';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function pct(value: number) { return `${value.toFixed(1)}%`; }
function minutes(value: number | null) { return value == null ? '—' : value < 60 ? `${Math.round(value)} min` : `${(value / 60).toFixed(1)} h`; }
function hours(value: number | null) { return value == null ? '—' : `${value.toFixed(1)} h`; }

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const params = await searchParams;
  const days = [30, 90, 180, 365].includes(Number(params.days)) ? Number(params.days) : 90;
  const data = await getAnalyticsAction(days);
  const a = data.administration;
  const occupancy = a.propertiesTotal ? (a.propertiesOccupied / a.propertiesTotal) * 100 : 0;

  return <div>
    <Header title="Analytics" subtitle="Indicadores comerciales, administrativos y operativos" />
    <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-wrap gap-2" aria-label="Período de análisis">
        {[30,90,180,365].map((value) => <Link key={value} href={`/analytics?days=${value}`} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${days === value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>{value} días</Link>)}
      </div>

      <section aria-labelledby="commercial-title" className="space-y-4">
        <h2 id="commercial-title" className="text-lg font-bold text-slate-900">Comercial</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Leads" value={data.commercial.leadsTotal} />
          <Kpi label="Conversión" value={pct(data.commercial.conversionRate)} />
          <Kpi label="1ª respuesta" value={minutes(data.commercial.avgFirstResponseMinutes)} />
          <Kpi label="Cierres" value={data.commercial.dealsWon} />
          <Kpi label="Visitas" value={data.commercial.visitsTotal} />
          <Kpi label="Reservas" value={data.commercial.reservationsTotal} />
          <Kpi label="Leads ganados" value={data.commercial.leadsWon} />
          <Kpi label="Días a cierre" value={data.commercial.avgDaysToClose == null ? '—' : data.commercial.avgDaysToClose.toFixed(1)} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Table title="Conversión por fuente" headers={['Fuente','Leads','Ganados','Conversión']} rows={data.leadsBySource.map((x) => [x.source,x.leads,x.won,pct(x.conversionRate)])} />
          <Table title="Performance por agente" headers={['Agente','Leads','Ganados','Cierres','Respuesta']} rows={data.agents.map((x) => [x.name,x.leads,x.leadsWon,x.dealsWon,minutes(x.avgResponseMinutes)])} />
        </div>
      </section>

      <section aria-labelledby="admin-title" className="space-y-4">
        <h2 id="admin-title" className="text-lg font-bold text-slate-900">Administración</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Ocupación" value={pct(occupancy)} />
          <Kpi label="Alquiler esperado/mes" value={formatCurrency(a.expectedMonthlyRent)} />
          <Kpi label="Cobrado este mes" value={formatCurrency(a.collectedMonth)} />
          <Kpi label="Morosidad" value={formatCurrency(a.outstandingDebt)} />
          <Kpi label="Contratos por vencer" value={a.expiringLeases} />
          <Kpi label="Ajustes próximos" value={a.upcomingAdjustments} />
          <Kpi label="Liquidaciones pendientes" value={a.pendingSettlements} />
          <Kpi label="Monto a liquidar" value={formatCurrency(a.pendingSettlementAmount)} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Table title="Aging de deuda" headers={['Antigüedad','Casos','Saldo']} rows={data.debtAging.map((x) => [x.bucket,x.count,formatCurrency(x.amount)])} />
          <Table title="Flujo por propiedad" headers={['Propiedad','Cobrado','Gastos','Mantenimiento','Flujo neto']} rows={data.propertyEconomics.map((x) => [`${x.code} · ${x.address}`,formatCurrency(x.collected),formatCurrency(x.expenses),formatCurrency(x.maintenanceCost),formatCurrency(x.netFlow)])} />
        </div>
      </section>

      <section aria-labelledby="ops-title" className="space-y-4">
        <h2 id="ops-title" className="text-lg font-bold text-slate-900">Operación</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Kpi label="Mantenimiento abierto" value={data.maintenance.openCount} />
          <Kpi label="Urgentes" value={data.maintenance.urgentCount} />
          <Kpi label="Resolución media" value={hours(data.maintenance.avgResolutionHours)} />
          <Kpi label={`Costo ${days}d`} value={formatCurrency(data.maintenance.totalCost)} />
          <Kpi label="Tareas vencidas" value={data.maintenance.overdueTasks} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Table title="Proveedores" headers={['Proveedor','Trabajos','Resueltos','Costo','Promedio']} rows={data.providers.map((x) => [x.providerName,x.requests,x.resolved,formatCurrency(x.totalCost),formatCurrency(x.avgCost)])} />
          <Table title="Equipo" headers={['Usuario','Tareas abiertas','Tareas cerradas','Mant. abierto','Mant. resuelto']} rows={data.team.map((x) => [x.name,x.openTasks,x.completedTasks,x.openMaintenance,x.resolvedMaintenance])} />
        </div>
      </section>
    </main>
  </div>;
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs"><p className="text-[11px] uppercase tracking-wide font-bold text-slate-500">{label}</p><p className="mt-2 text-xl font-extrabold text-slate-900 break-words">{value}</p></div>;
}

function Table({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"><h3 className="font-bold text-sm text-slate-900 p-4 border-b border-slate-100">{title}</h3><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{headers.map((h) => <th key={h} scope="col" className="text-left px-3 py-2 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row,i) => <tr key={i} className="border-t border-slate-100">{row.map((cell,j) => <td key={j} className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-3 py-8 text-center text-slate-400">Sin datos para el período.</td></tr>}</tbody></table></div></div>;
}
