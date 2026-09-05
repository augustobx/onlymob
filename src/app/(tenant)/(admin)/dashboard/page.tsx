import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { getDashboardMetricsAction } from '@/actions/debts-payments';
import { getPropertiesAction } from '@/actions/properties';
import { getGaragesAction } from '@/actions/garages';
import { getRentAdjustmentScheduleAction } from '@/actions/rent-adjustments';
import { getLatestICL } from '@/lib/bcra';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertTriangle,ArrowUpRight,Building2,CalendarClock,CheckCircle2,CreditCard,FilePlus,KeyRound,TrendingUp,Warehouse,WalletCards } from 'lucide-react';
import { DataTable, EmptyState, MetricCard, SectionCard } from '@/components/entity-360/entity-360-ui';

export const dynamic='force-dynamic';

function adjustmentBucketClass(key:string,count:number,firstMonthKey?:string){
 if(key==='atrasados') return count>0?'border-rose-200 bg-rose-50 hover:border-rose-300':'border-slate-200 bg-white hover:border-slate-300';
 if(key===firstMonthKey) return count>0?'border-amber-200 bg-amber-50 hover:border-amber-300':'border-slate-200 bg-white hover:border-slate-300';
 return count>0?'border-indigo-200 bg-indigo-50/60 hover:border-indigo-300':'border-slate-200 bg-white hover:border-slate-300';
}

export default async function DashboardPage(){
 const[metrics,properties,garages,icl,adjustments]=await Promise.all([getDashboardMetricsAction(),getPropertiesAction(),getGaragesAction(),getLatestICL(),getRentAdjustmentScheduleAction()]);
 const propertiesWithDebt=properties.filter((p)=>(p.activeLease?.pendingDebtTotal||0)>0).sort((a,b)=>(b.activeLease?.pendingDebtTotal||0)-(a.activeLease?.pendingDebtTotal||0));
 const occupancy=metrics.propertiesTotal?Math.round(metrics.propertiesRented/metrics.propertiesTotal*100):0;
 const garageOccupancy=metrics.spacesTotal?Math.round(metrics.spacesOccupied/metrics.spacesTotal*100):0;
 const adjustmentBuckets=[adjustments.overdue,...adjustments.months];
 const thisMonth=adjustments.months[0];

 return <div>
  <Header title="Dashboard" subtitle="Estado ejecutivo de la operación" actionButton={<div className="flex gap-2"><Link href="/contratos" className="btn-secondary"><FilePlus className="w-4 h-4"/> Contrato</Link><Link href="/cobranzas" className="btn-primary"><CreditCard className="w-4 h-4"/> Registrar pago</Link></div>}/>
  <main className="app-page"><div className="page-container space-y-6">
   <section className="dashboard-intro"><div><p className="dashboard-intro__eyebrow">Resumen operativo</p><h2>Tu inmobiliaria, de un vistazo.</h2><p>Los puntos que requieren atención aparecen primero; el detalle vive en cada ficha 360.</p></div><div className="dashboard-icl"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4"/><span>ICL BCRA</span></div><strong>{icl.valor.toFixed(4)}</strong><small>{formatDate(icl.fecha)}</small></div></section>

   <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
    <MetricCard label="Cobrado este mes" value={formatCurrency(metrics.totalRevenueMonth)} detail="Pagos registrados" icon={<WalletCards className="w-5 h-5"/>}/>
    <MetricCard label="Ocupación" value={`${occupancy}%`} detail={`${metrics.propertiesRented} de ${metrics.propertiesTotal} propiedades`} icon={<Building2 className="w-5 h-5"/>}/>
    <MetricCard label="Alquileres vencidos" value={metrics.propertyDebtsOverdue} detail={`${metrics.propertyDebtsDueSoon} vencen en 10 días`} icon={<AlertTriangle className="w-5 h-5"/>}/>
    <MetricCard label="Cocheras ocupadas" value={`${garageOccupancy}%`} detail={`${metrics.spacesFree} plazas libres`} icon={<Warehouse className="w-5 h-5"/>}/>
    <MetricCard label="Propiedades libres" value={metrics.propertiesFree} detail="Disponibles para operación" icon={<KeyRound className="w-5 h-5"/>}/>
   </div>

   <SectionCard title="Calendario de aumentos" subtitle="Qué alquileres deben actualizarse mes por mes" action={<Link href={`/aumentos?mes=${thisMonth?.key||''}`} className="text-xs font-semibold text-indigo-600 inline-flex items-center gap-1">Ver calendario completo <ArrowUpRight className="w-3.5 h-3.5"/></Link>}>
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-950 to-indigo-800 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
     <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><CalendarClock className="w-5 h-5 text-indigo-200"/></div><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-indigo-200">Este mes</p><p className="text-sm font-black">{thisMonth?.count||0} {(thisMonth?.count||0)===1?'contrato requiere':'contratos requieren'} aumento</p></div></div>
     <div className="text-left sm:text-right"><p className="text-[10px] font-bold text-indigo-200">Alquiler actual involucrado</p><p className="font-mono text-lg font-black">{formatCurrency(thisMonth?.totalRent||0)}</p></div>
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
     {adjustmentBuckets.map(bucket=><Link key={bucket.key} href={`/aumentos?mes=${bucket.key}`} className={`group rounded-2xl border p-3.5 transition hover:-translate-y-0.5 hover:shadow-md ${adjustmentBucketClass(bucket.key,bucket.count,thisMonth?.key)}`}>
      <div className="flex items-start justify-between gap-2"><div><p className={`text-[9px] font-black uppercase tracking-wider ${bucket.key==='atrasados'&&bucket.count>0?'text-rose-500':bucket.key===thisMonth?.key&&bucket.count>0?'text-amber-600':'text-slate-400'}`}>{bucket.key==='atrasados'?'Pendientes':'Período'}</p><p className="mt-1 text-xs font-black text-slate-900">{bucket.label}</p></div><ArrowUpRight className="w-3.5 h-3.5 text-slate-400 transition group-hover:text-indigo-600"/></div>
      <div className="mt-4 flex items-baseline gap-1"><strong className={`text-2xl font-black ${bucket.key==='atrasados'&&bucket.count>0?'text-rose-600':bucket.key===thisMonth?.key&&bucket.count>0?'text-amber-700':'text-indigo-700'}`}>{bucket.count}</strong><span className="text-[9px] font-bold text-slate-400">contratos</span></div>
      <p className="mt-2 truncate text-[10px] font-semibold text-slate-500">{formatCurrency(bucket.totalRent)}</p>
     </Link>)}
    </div>
   </SectionCard>

   <div className="grid xl:grid-cols-[1.35fr_.65fr] gap-5">
    <SectionCard title="Atención inmediata" subtitle="Alquileres con saldo pendiente" action={<Link href="/cobranzas" className="text-xs font-semibold text-indigo-600 inline-flex items-center gap-1">Ver cobranzas <ArrowUpRight className="w-3.5 h-3.5"/></Link>}>
     {propertiesWithDebt.length?<DataTable headers={['Propiedad','Inquilino','Saldo','Acción']} rows={propertiesWithDebt.slice(0,8).map(p=>[
      <Link key="p" href={`/propiedades/${p.id}`} className="font-semibold text-indigo-600">{p.code} · {p.address}</Link>,
      p.activeLease?.renterName||'—',
      <span key="d" className="font-mono font-bold text-rose-600">{formatCurrency(p.activeLease?.pendingDebtTotal)}</span>,
      <Link key="a" href={`/propiedades/${p.id}#cuenta`} className="text-xs font-semibold text-slate-600">Ver 360</Link>,
     ])}/>:<div className="empty-state py-12"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500"/>No hay alquileres con deuda pendiente.</div>}
    </SectionCard>

    <SectionCard title="Capacidad de cocheras" subtitle="Ocupación por ubicación" action={<Link href="/cocheras" className="text-xs font-semibold text-indigo-600">Gestionar</Link>}>
     <div className="space-y-3">{garages.length?garages.slice(0,7).map(g=>{const percent=g.totalSpaces?Math.round(g.occupied/g.totalSpaces*100):0;return <div key={g.id} className="dashboard-progress"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-sm text-slate-900 truncate">{g.name}</p><p className="text-[10px] text-slate-400 truncate">{g.address}</p></div><span className="font-mono text-xs font-bold text-slate-600">{g.occupied}/{g.totalSpaces}</span></div><div className="dashboard-progress__track"><div className="dashboard-progress__bar" style={{width:`${percent}%`}}/></div><div className="flex justify-between text-[10px] text-slate-400"><span>{percent}% ocupado</span><span>{g.free} libres</span></div></div>}):<EmptyState>No hay cocheras registradas.</EmptyState>}</div>
    </SectionCard>
   </div>

   <section className="quick-actions"><Link href="/propiedades" className="quick-action"><Building2 className="w-5 h-5"/><div><b>Propiedades 360</b><span>Comercial, contratos, cuenta y mantenimiento</span></div><ArrowUpRight className="w-4 h-4 ml-auto"/></Link><Link href="/aumentos" className="quick-action"><CalendarClock className="w-5 h-5"/><div><b>Aumentos</b><span>Calendario mensual de alquileres</span></div><ArrowUpRight className="w-4 h-4 ml-auto"/></Link><Link href="/finanzas" className="quick-action"><WalletCards className="w-5 h-5"/><div><b>Finanzas</b><span>Cuentas, movimientos y conciliación</span></div><ArrowUpRight className="w-4 h-4 ml-auto"/></Link><Link href="/analytics" className="quick-action"><TrendingUp className="w-5 h-5"/><div><b>Analytics</b><span>Comercial, administración y operación</span></div><ArrowUpRight className="w-4 h-4 ml-auto"/></Link></section>
  </div></main>
 </div>
}
