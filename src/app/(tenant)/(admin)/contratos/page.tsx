import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { getLeasesAction } from '@/actions/leases';
import { getProfessionalLeaseDataAction } from '@/actions/lease-professional';
import { getPropertiesAction } from '@/actions/properties';
import { getRentersAction } from '@/actions/renters';
import { getGaragesAction } from '@/actions/garages';
import { getLatestICL } from '@/lib/bcra';
import { ContractsClient } from './contracts-client';
import { ProfessionalLeaseManager } from './professional-lease-manager';
import { DataTable,SectionCard,StatusPill } from '@/components/entity-360/entity-360-ui';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic='force-dynamic';
const money=(v:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(v||0);
const date=(v:any)=>new Intl.DateTimeFormat('es-AR').format(new Date(v));

export default async function ContratosPage(){
 const[leases,professionalData,properties,renters,garages,icl]=await Promise.all([getLeasesAction(),getProfessionalLeaseDataAction(),getPropertiesAction(),getRentersAction(),getGaragesAction(),getLatestICL()]);
 const availableProperties=properties.filter(p=>p.status==='DISPONIBLE');
 const availableSpaces=garages.flatMap(g=>g.spaces.filter(s=>s.status==='FREE').map(s=>({id:s.id,spaceNumber:s.spaceNumber,garageName:g.name})));
 return <div><Header title="Contratos" subtitle="Locaciones, garantías, ajustes y cuenta contractual"/><ModuleShell>
  <SectionCard title="Contratos 360" subtitle="Entrá a un contrato para ver propiedad, inquilino, deuda, pagos, ajustes, mantenimiento y documentos"><DataTable headers={['Propiedad','Inquilino','Vigencia','Alquiler','Saldo','Estado','Ficha']} rows={leases.propertyLeases.map(l=>[
   <Link key="p" href={`/propiedades/${l.propertyId}`} className="font-semibold text-indigo-600">{l.propertyCode} · {l.propertyAddress}</Link>,l.renterName,`${date(l.startDate)} → ${date(l.endDate)}`,money(l.currentRent),<span key="d" className={l.pendingDebtTotal>0?'font-mono font-bold text-rose-600':'font-mono text-emerald-600'}>{money(l.pendingDebtTotal)}</span>,<StatusPill key="s" tone={l.status==='CURRENT'?'success':l.status==='EXPIRING'?'warning':'neutral'}>{l.status}</StatusPill>,<Link key="v" href={`/contratos/${l.id}`} className="btn-secondary py-1.5 min-h-0">Ver 360</Link>
  ])}/></SectionCard>
  <ProfessionalLeaseManager data={professionalData as any}/>
  <ContractsClient propertyLeases={leases.propertyLeases} garageLeases={leases.garageLeases} properties={availableProperties} renters={renters} availableSpaces={availableSpaces} currentIclValue={icl.valor}/>
 </ModuleShell></div>
}
