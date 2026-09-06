import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { getOperationsDataAction } from '@/actions/operations';
import { OperationsClient } from './operations-client';
import { DataTable,SectionCard,StatusPill } from '@/components/entity-360/entity-360-ui';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic='force-dynamic';
const money=(v:any,c='ARS')=>v==null?'—':new Intl.NumberFormat('es-AR',{style:'currency',currency:c,maximumFractionDigits:2}).format(Number(v));
export default async function OperationsPage(){const data=await getOperationsDataAction();return <div><Header title="Operaciones" subtitle="Publicaciones, reservas, negociación y cierres"/><ModuleShell><SectionCard title="Operaciones 360" subtitle="Negocios abiertos y cerrados con todo su contexto"><DataTable headers={['Propiedad','Contacto','Operación','Importe','Agente','Estado','Ficha']} rows={(data.deals as any[]).map(d=>[<Link key="p" href={`/propiedades/${d.property.id}`} className="font-semibold text-indigo-600">{d.property.code} · {d.property.address}</Link>,`${d.contact?.firstName||''} ${d.contact?.lastName||''}`.trim()||'—',d.operation,money(d.amount,d.currency),d.agent?.name||'—',<StatusPill key="s" tone={d.status==='WON'?'success':d.status==='LOST'||d.status==='CANCELED'?'danger':'warning'}>{d.status}</StatusPill>,<Link key="v" href={`/operaciones/${d.id}`} className="btn-secondary py-1.5 min-h-0">Ver 360</Link>])}/></SectionCard><OperationsClient data={data as any}/></ModuleShell></div>}
