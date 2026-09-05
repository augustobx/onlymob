import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { getDashboardMetricsAction } from '@/actions/debts-payments';
import { getPropertiesAction } from '@/actions/properties';
import { getGaragesAction } from '@/actions/garages';
import { getLatestICL } from '@/lib/bcra';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertTriangle,ArrowUpRight,Building2,CheckCircle2,CreditCard,FilePlus,KeyRound,TrendingUp,Warehouse,WalletCards } from 'lucide-react';
import { DataTable, EmptyState, MetricCard, SectionCard, StatusPill } from '@/components/entity-360/entity-360-ui';

export const dynamic='force-dynamic';

export default async function DashboardPage(){
 const[metrics,properties,garages,icl]=await Promise.all([getDashboardMetricsAction(),getPropertiesAction(),getGaragesAction(),getLatestICL()]);
 const propertiesWithDebt=properties.filter((p)=>(p.activeLease?.pendingDebtTotal||0)>0).sort((a,b)=>(b.activeLease?.pendingDebtTotal||0)-(a.activeLease?.pendingDebtTotal||0));
 const occupancy=metrics.propertiesTotal?Math.round(metrics.propertiesRented/metrics.propertiesTotal*100):0;
 const garageOccupancy=metrics.spacesTotal?Math.round(metrics.spacesOccupied/metrics.spacesTotal*100):0;

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

   <section className="quick-actions"><Link href="/propiedades" className="quick-action"><Building2 className="w-5 h-5"/><div><b>Propiedades 360</b><span>Comercial, contratos, cuenta y mantenimiento</span></div><ArrowUpRight className="w-4 h-4 ml-auto"/></Link><Link href="/comunicaciones" className="quick-action"><CreditCard className="w-5 h-5"/><div><b>Comunicaciones</b><span>Portal, email y WhatsApp</span></div><ArrowUpRight className="w-4 h-4 ml-auto"/></Link><Link href="/finanzas" className="quick-action"><WalletCards className="w-5 h-5"/><div><b>Finanzas</b><span>Cuentas, movimientos y conciliación</span></div><ArrowUpRight className="w-4 h-4 ml-auto"/></Link><Link href="/analytics" className="quick-action"><TrendingUp className="w-5 h-5"/><div><b>Analytics</b><span>Comercial, administración y operación</span></div><ArrowUpRight className="w-4 h-4 ml-auto"/></Link></section>
  </div></main>
 </div>
}
