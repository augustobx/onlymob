import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { getAnalyticsAction } from '@/actions/analytics';
import { formatCurrency } from '@/lib/utils';
import { requirePermission } from '@/lib/permissions';
import { isTenantFeatureEnabled } from '@/lib/saas';

export const dynamic='force-dynamic';
const pct=(v:number)=>`${v.toFixed(1)}%`;
const mins=(v:number|null)=>v==null?'—':v<60?`${Math.round(v)} min`:`${(v/60).toFixed(1)} h`;

export default async function AnalyticsPage({searchParams}:{searchParams:Promise<{days?:string}>}){
  const { tenant }=await requirePermission('analytics','read');
  if(!(await isTenantFeatureEnabled(tenant.id,'analytics',true))) notFound();
  const params=await searchParams; const days=[30,90,180,365].includes(Number(params.days))?Number(params.days):90; const data=await getAnalyticsAction(days); const a=data.administration;
  return <div><Header title="Analytics" subtitle="Indicadores comerciales, administrativos y operativos"/><main className="page-container space-y-8">
    <nav className="flex flex-wrap gap-2" aria-label="Período de análisis">{[30,90,180,365].map(v=><Link key={v} href={`/analytics?days=${v}`} className={days===v?'btn-primary':'btn-secondary'}>{v} días</Link>)}</nav>
    <Section title="Comercial"><Grid><K label="Leads" v={data.commercial.leadsTotal}/><K label="Conversión" v={pct(data.commercial.conversionRate)}/><K label="1ª respuesta" v={mins(data.commercial.avgFirstResponseMinutes)}/><K label="Cierres" v={data.commercial.dealsWon}/><K label="Visitas" v={data.commercial.visitsTotal}/><K label="Reservas" v={data.commercial.reservationsTotal}/><K label="Ganados" v={data.commercial.leadsWon}/><K label="Días a cierre" v={data.commercial.avgDaysToClose?.toFixed(1)??'—'}/></Grid><Tables><T title="Conversión por fuente" h={['Fuente','Leads','Ganados','Conversión']} r={data.leadsBySource.map(x=>[x.source,x.leads,x.won,pct(x.conversionRate)])}/><T title="Performance por agente" h={['Agente','Leads','Ganados','Cierres','Respuesta']} r={data.agents.map(x=>[x.name,x.leads,x.leadsWon,x.dealsWon,mins(x.avgResponseMinutes)])}/></Tables></Section>
    <Section title="Administración"><Grid><K label="Ocupación" v={pct(a.occupancyRate)}/><K label="Esperado/mes" v={formatCurrency(a.expectedMonthlyRent)}/><K label="Cobrado mes" v={formatCurrency(a.collectedMonth)}/><K label="Morosidad" v={formatCurrency(a.outstandingDebt)}/><K label="Contratos por vencer" v={a.expiringLeases}/><K label="Ajustes próximos" v={a.upcomingAdjustments}/><K label="Liquidaciones" v={a.pendingSettlements}/><K label="A liquidar" v={formatCurrency(a.pendingSettlementAmount)}/></Grid><Tables><T title="Aging de deuda" h={['Antigüedad','Casos','Saldo']} r={data.aging.map(x=>[x.bucket,x.count,formatCurrency(x.amount)])}/><T title="Flujo por propiedad" h={['Propiedad','Cobrado','Gastos','Mant.','Neto']} r={data.propertyEconomics.map(x=>[`${x.code} · ${x.address}`,formatCurrency(x.collected),formatCurrency(x.expenses),formatCurrency(x.maintenanceCost),formatCurrency(x.netFlow)])}/></Tables></Section>
    <Section title="Operación"><Grid><K label="Mant. abierto" v={data.maintenance.openCount}/><K label="Urgentes" v={data.maintenance.urgentCount}/><K label="Resolución media" v={data.maintenance.avgResolutionHours==null?'—':`${data.maintenance.avgResolutionHours.toFixed(1)} h`}/><K label={`Costo ${days}d`} v={formatCurrency(data.maintenance.totalCost)}/><K label="Tareas vencidas" v={data.maintenance.overdueTasks}/></Grid><Tables><T title="Proveedores" h={['Proveedor','Trabajos','Resueltos','Costo','Promedio']} r={data.providers.map(x=>[x.providerName,x.requests,x.resolved,formatCurrency(x.totalCost),formatCurrency(x.avgCost)])}/><T title="Equipo" h={['Usuario','Tareas abiertas','Cerradas','Mant. abierto','Resuelto']} r={data.team.map(x=>[x.name,x.openTasks,x.completedTasks,x.openMaintenance,x.resolvedMaintenance])}/></Tables></Section>
  </main></div>;
}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="space-y-4"><h2 className="text-lg font-bold text-slate-900">{title}</h2>{children}</section>}
function Grid({children}:{children:React.ReactNode}){return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>}
function Tables({children}:{children:React.ReactNode}){return <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{children}</div>}
function K({label,v}:{label:string;v:string|number}){return <div className="metric-card"><p className="metric-card__label">{label}</p><p className="metric-card__value">{v}</p></div>}
function T({title,h,r}:{title:string;h:string[];r:Array<Array<string|number>>}){return <div className="section-card overflow-hidden"><h3 className="p-4 border-b font-bold text-sm">{title}</h3><div className="data-table-wrap"><table className="data-table"><thead><tr>{h.map(x=><th key={x} scope="col">{x}</th>)}</tr></thead><tbody>{r.length?r.map((row,i)=><tr key={i}>{row.map((c,j)=><td key={j}>{c}</td>)}</tr>):<tr><td colSpan={h.length} className="!p-6 text-center text-slate-400">Sin datos.</td></tr>}</tbody></table></div></div>}
