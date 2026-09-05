import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Banknote, Building2, CalendarDays, ContactRound, FileText, Handshake, MessageSquare, Phone, UserRound, Wrench } from 'lucide-react';
import { getContact360Action } from '@/actions/entity-360';
import { DataTable, DetailGrid, EmptyState, EntityHero, MetricCard, SectionCard, StatusPill, Timeline } from '@/components/entity-360/entity-360-ui';

export const dynamic = 'force-dynamic';

const money = (value: unknown, currency='ARS') => new Intl.NumberFormat('es-AR',{style:'currency',currency,maximumFractionDigits:2}).format(Number(value||0));
const date = (value: unknown) => value ? new Intl.DateTimeFormat('es-AR').format(new Date(String(value))) : '—';
const personName = (person: any) => person?.companyName || `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'Sin nombre';
function tone(status?: string): 'neutral'|'success'|'warning'|'danger'|'info' { if (!status) return 'neutral'; if (['ACTIVE','CURRENT','PAID','WON','RESOLVED','READY'].includes(status)) return 'success'; if (['LOST','CANCELED','ARCHIVED','FAILED'].includes(status)) return 'danger'; if (['PENDING','PARTIAL','EXPIRING','URGENT','HIGH'].includes(status)) return 'warning'; return 'info'; }

export default async function Contact360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getContact360Action(id);
  if (!data) notFound();
  const c: any = data.contact;
  const displayName = personName(c);
  const totalOwned = c.ownedProperties.length;
  const openLeads = c.leads.filter((lead:any)=>!['WON','LOST'].includes(lead.status)).length;
  const settlementsNet = c.ownerSettlements.reduce((sum:number,s:any)=>sum+Number(s.netAmount||0),0);
  const maintenanceOpen = c.providedMaintenance.filter((m:any)=>!['RESOLVED','CANCELED'].includes(m.status)).length;
  const roles = c.roles.map((role:any)=>role.role);

  return <div className="app-page"><div className="page-container space-y-6">
    <Link href="/contactos" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Contactos</Link>
    <EntityHero eyebrow="Contacto 360" title={displayName} subtitle={[c.documentNumber || c.cuit, c.email, c.phone].filter(Boolean).join(' · ') || 'Ficha integral del contacto'} badges={roles.map((role:string)=>({label:role,tone:'info' as const}))} actions={<><Link href="/crm" className="btn-secondary"><Handshake className="w-4 h-4" /> CRM</Link><Link href="/comunicaciones" className="btn-primary"><MessageSquare className="w-4 h-4" /> Comunicar</Link></>} media={<div className="entity-hero__placeholder"><ContactRound className="w-12 h-12" /><span>{roles.join(' · ') || 'CONTACTO'}</span></div>} />

    <nav className="entity-subnav" aria-label="Secciones de contacto 360">{[['resumen','Resumen'],['propiedades','Propiedades'],['comercial','Comercial'],['agenda','Agenda'],['economia','Economía'],['mantenimiento','Mantenimiento'],['comunicaciones','Comunicaciones'],['actividad','Actividad']].map(([href,label])=><a key={href} href={`#${href}`} className="entity-subnav__link">{label}</a>)}</nav>

    <section id="resumen" className="scroll-mt-28 space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3"><MetricCard label="Propiedades" value={totalOwned} icon={<Building2 className="w-5 h-5" />} /><MetricCard label="Leads abiertos" value={openLeads} icon={<Handshake className="w-5 h-5" />} /><MetricCard label="Liquidado histórico" value={money(settlementsNet)} icon={<Banknote className="w-5 h-5" />} /><MetricCard label="Mantenimientos abiertos" value={maintenanceOpen} icon={<Wrench className="w-5 h-5" />} /><MetricCard label="Comunicaciones" value={(data.communications as any[]).length} icon={<MessageSquare className="w-5 h-5" />} /></div>
      <div className="grid xl:grid-cols-2 gap-5">
        <SectionCard title="Identidad y contacto" subtitle="Datos personales, fiscales y de contacto"><DetailGrid items={[
          {label:'Nombre',value:displayName},{label:'Documento',value:[c.documentType,c.documentNumber].filter(Boolean).join(' ') || '—'},{label:'CUIT',value:c.cuit || '—'},{label:'Email',value:c.email || '—'},{label:'Teléfono',value:c.phone || '—'},{label:'Teléfono alternativo',value:c.alternatePhone || '—'},{label:'Domicilio',value:[c.address,c.city,c.province].filter(Boolean).join(', ') || '—'},{label:'Estado',value:c.isActive ? 'Activo' : 'Inactivo'}]} /></SectionCard>
        <SectionCard title="Datos bancarios / propietario" subtitle="Información operativa para liquidaciones"><DetailGrid items={[{label:'Alias',value:c.bankAlias || '—'},{label:'CBU/CVU',value:c.bankCbu || '—'},{label:'Portal propietario',value:c.ownerPortalEnabled ? 'Habilitado' : 'Deshabilitado'},{label:'Último acceso portal',value:date(c.ownerPortalLastLoginAt)},{label:'Proveedor',value:c.providerProfile?.isActive ? 'Proveedor activo' : (c.providerProfile ? 'Proveedor inactivo' : 'No aplica')},{label:'Rating proveedor',value:c.providerProfile?.rating || '—'}]} /></SectionCard>
      </div>
    </section>

    <SectionCard id="propiedades" title="Propiedades y titularidad" subtitle="Inmuebles relacionados como propietario"><DataTable headers={['Propiedad','Titularidad','Estado','Contrato vigente','Agente']} rows={c.ownedProperties.map((ownership:any)=>[<Link key="p" href={`/propiedades/${ownership.property.id}`} className="font-semibold text-indigo-600 hover:text-indigo-800">{ownership.property.code} · {ownership.property.address}</Link>,`${Number(ownership.ownershipPercentage).toFixed(2)}%`,<StatusPill key="s" tone={tone(ownership.property.status)}>{ownership.property.status}</StatusPill>,ownership.property.propertyLeases[0] ? `${ownership.property.propertyLeases[0].renter.firstName} ${ownership.property.propertyLeases[0].renter.lastName}` : '—',ownership.property.agent?.name || '—'])} /></SectionCard>

    <SectionCard id="comercial" title="CRM y operaciones" subtitle="Leads, demandas, reservas y cierres relacionados"><div className="space-y-5"><DataTable headers={['Lead','Estado','Agente','Última actualización']} rows={c.leads.map((lead:any)=>[lead.title,<StatusPill key="s" tone={tone(lead.status)}>{lead.status}</StatusPill>,lead.agent?.name || '—',date(lead.updatedAt)])} /><DataTable headers={['Propiedad','Operación','Importe','Estado']} rows={c.deals.map((deal:any)=>[<Link key="p" href={`/propiedades/${deal.property.id}`} className="text-indigo-600 font-semibold">{deal.property.code} · {deal.property.address}</Link>,deal.operation,deal.amount ? money(deal.amount,deal.currency) : '—',<StatusPill key="s" tone={tone(deal.status)}>{deal.status}</StatusPill>])} /></div></SectionCard>

    <SectionCard id="agenda" title="Agenda y tareas" subtitle="Seguimientos y actividad pendiente"><div className="grid xl:grid-cols-2 gap-5"><DataTable headers={['Evento','Propiedad','Fecha','Estado']} rows={c.calendarEvents.map((event:any)=>[event.title,event.property ? `${event.property.code} · ${event.property.address}` : '—',date(event.startsAt),<StatusPill key="s" tone={tone(event.status)}>{event.status}</StatusPill>])} /><DataTable headers={['Tarea','Propiedad','Responsable','Estado']} rows={c.tasks.map((task:any)=>[task.title,task.property ? `${task.property.code} · ${task.property.address}` : '—',task.assignee?.name || '—',<StatusPill key="s" tone={tone(task.status)}>{task.status}</StatusPill>])} /></div></SectionCard>

    <SectionCard id="economia" title="Economía y liquidaciones" subtitle="Gastos, rendiciones y movimientos relacionados"><div className="space-y-5"><DataTable headers={['Período','Neto','Estado','Propiedades']} rows={c.ownerSettlements.map((settlement:any)=>[`${date(settlement.periodStart)} → ${date(settlement.periodEnd)}`,money(settlement.netAmount),<StatusPill key="s" tone={tone(settlement.status)}>{settlement.status}</StatusPill>,settlement.lines.map((line:any)=>line.property?.code).filter(Boolean).join(', ') || '—'])} /><DataTable headers={['Movimiento','Cuenta','Propiedad','Importe','Fecha']} rows={(data.financialMovements as any[]).map((movement:any)=>[movement.concept,movement.accountName,movement.propertyId ? <Link key="p" href={`/propiedades/${movement.propertyId}`} className="text-indigo-600 font-semibold">Ver propiedad</Link> : '—',money(movement.amount,movement.currency),date(movement.occurredAt)])} /></div></SectionCard>

    <SectionCard id="mantenimiento" title="Mantenimiento / proveedor" subtitle="Trabajos vinculados al contacto"><DataTable headers={['Propiedad','Trabajo','Costo','Estado']} rows={c.providedMaintenance.map((request:any)=>[<Link key="p" href={`/propiedades/${request.property.id}`} className="text-indigo-600 font-semibold">{request.property.code} · {request.property.address}</Link>,request.title,money(request.actualCost || request.approvedAmount || request.quotedAmount || 0),<StatusPill key="s" tone={tone(request.status)}>{request.status}</StatusPill>])} /></SectionCard>

    <SectionCard id="comunicaciones" title="Comunicaciones" subtitle="Hilos vinculados a este contacto" action={<Link href="/comunicaciones" className="btn-secondary"><MessageSquare className="w-4 h-4" /> Abrir inbox</Link>}><DataTable headers={['Asunto','Mensajes','Propiedad','Última actividad','Estado']} rows={(data.communications as any[]).map((thread:any)=>[thread.subject,Number(thread.messageCount||0),thread.propertyId ? <Link key="p" href={`/propiedades/${thread.propertyId}`} className="text-indigo-600 font-semibold">Ver</Link> : '—',date(thread.lastMessageAt || thread.updatedAt),<StatusPill key="s" tone={tone(thread.status)}>{thread.status}</StatusPill>])} /></SectionCard>

    <SectionCard id="actividad" title="Actividad 360" subtitle="Timeline transversal del contacto"><Timeline items={(data.activity as any[]).map((event:any)=>({id:event.id,title:event.title,detail:event.propertyCode ? `${event.propertyCode} · ${event.propertyAddress || ''}` : event.description,date:event.createdAt,actor:event.actorName}))} /></SectionCard>
  </div></div>;
}
