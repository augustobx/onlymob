import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Banknote, Building2, CalendarDays, CircleDollarSign, ClipboardCheck,
  FileText, Handshake, Home, KeyRound, MapPin, MessageSquare, UserRound, UsersRound,
  Wrench, ExternalLink, TrendingUp,
} from 'lucide-react';
import { getProperty360Action } from '@/actions/entity-360';
import { DataTable, DetailGrid, EmptyState, EntityHero, MetricCard, SectionCard, StatusPill, Timeline } from '@/components/entity-360/entity-360-ui';

export const dynamic = 'force-dynamic';

const money = (value: unknown, currency = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
const date = (value: unknown) => value ? new Intl.DateTimeFormat('es-AR').format(new Date(String(value))) : '—';
const name = (person: any) => person ? (person.companyName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Sin nombre') : '—';

function tone(status?: string): 'neutral'|'success'|'warning'|'danger'|'info' {
  if (!status) return 'neutral';
  if (['CURRENT','PAID','PUBLISHED','WON','RESOLVED','COMPLETED','AVAILABLE','DELIVERED'].includes(status)) return 'success';
  if (['OVERDUE','CANCELED','LOST','ARCHIVED','FAILED'].includes(status)) return 'danger';
  if (['PENDING','PARTIAL','EXPIRING','RESERVED','URGENT','HIGH','UNDER_NEGOTIATION'].includes(status)) return 'warning';
  return 'info';
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProperty360Action(id);
  if (!data) notFound();

  const p: any = data.property;
  const leases = p.propertyLeases || [];
  const activeLease = leases.find((lease: any) => ['CURRENT','EXPIRING'].includes(lease.status));
  const allDebts = leases.flatMap((lease: any) => lease.debts || []);
  const allPayments = allDebts.flatMap((debt: any) => debt.payments || []);
  const pendingDebt = allDebts.reduce((sum: number, debt: any) => sum + Math.max(0, Number(debt.amount || 0) - Number(debt.paidAmount || 0)), 0);
  const collected = allPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
  const expenses = (p.propertyExpenses || []).reduce((sum: number, expense: any) => sum + Number(expense.amount || 0), 0);
  const maintenanceCost = (p.maintenanceRequests || []).reduce((sum: number, request: any) => sum + Number(request.actualCost || request.approvedAmount || request.quotedAmount || 0), 0);
  const openMaintenance = (p.maintenanceRequests || []).filter((request: any) => !['RESOLVED','CANCELED'].includes(request.status));
  const activePublications = (p.publications || []).filter((publication: any) => publication.status === 'PUBLISHED');
  const netFlow = collected - expenses - maintenanceCost;
  const currency = p.currency || 'ARS';

  const nav = [
    ['resumen','Resumen'],['comercial','Comercial'],['contratos','Contratos'],['cuenta','Cuenta'],['propietarios','Propietarios'],
    ['mantenimiento','Mantenimiento'],['documentos','Documentos'],['comunicaciones','Comunicaciones'],['actividad','Actividad'],
  ];

  return (
    <div className="app-page">
      <div className="page-container space-y-6">
        <Link href="/propiedades" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Propiedades</Link>

        <EntityHero
          eyebrow="Propiedad 360"
          title={`${p.code} · ${p.address}`}
          subtitle={[p.city, p.province].filter(Boolean).join(', ') || 'Ficha operativa integral'}
          badges={[
            { label: p.status, tone: tone(p.status) },
            { label: p.commercialStatus, tone: tone(p.commercialStatus) },
            { label: p.operation, tone: 'info' },
            { label: p.type, tone: 'neutral' },
          ]}
          actions={<>
            <Link href="/operaciones" className="btn-secondary"><Handshake className="w-4 h-4" /> Operaciones</Link>
            <Link href="/mantenimiento" className="btn-primary"><Wrench className="w-4 h-4" /> Mantenimiento</Link>
          </>}
          media={p.coverImageUrl ? <img src={p.coverImageUrl} alt={p.address} className="w-full h-full object-cover" /> : <div className="entity-hero__placeholder"><Building2 className="w-12 h-12" /><span>Sin portada</span></div>}
        />

        <nav className="entity-subnav" aria-label="Secciones de propiedad 360">
          {nav.map(([href,label]) => <a key={href} href={`#${href}`} className="entity-subnav__link">{label}</a>)}
        </nav>

        <section id="resumen" className="scroll-mt-28 space-y-5">
          <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
            <MetricCard label="Alquiler actual" value={activeLease ? money(activeLease.currentRent, currency) : 'Disponible'} detail={activeLease ? `hasta ${date(activeLease.endDate)}` : 'Sin contrato vigente'} icon={<KeyRound className="w-5 h-5" />} />
            <MetricCard label="Saldo pendiente" value={money(pendingDebt, currency)} detail={`${allDebts.filter((d:any)=>d.status!=='PAID').length} cargos abiertos`} icon={<CircleDollarSign className="w-5 h-5" />} />
            <MetricCard label="Cobrado histórico" value={money(collected, currency)} detail={`${allPayments.length} pagos`} icon={<Banknote className="w-5 h-5" />} />
            <MetricCard label="Flujo neto" value={money(netFlow, currency)} detail="Cobrado - gastos - mantenimiento" icon={<TrendingUp className="w-5 h-5" />} />
            <MetricCard label="Mantenimiento" value={openMaintenance.length} detail={`${p.maintenanceRequests.length} órdenes históricas`} icon={<Wrench className="w-5 h-5" />} />
            <MetricCard label="Publicaciones" value={activePublications.length} detail={`${p.publications.length} canales históricos`} icon={<ExternalLink className="w-5 h-5" />} />
          </div>

          <div className="grid xl:grid-cols-3 gap-5">
            <SectionCard title="Datos del inmueble" subtitle="Identidad y características">
              <DetailGrid items={[
                { label: 'Código', value: p.code }, { label: 'Dirección', value: p.address }, { label: 'Tipo', value: p.type },
                { label: 'Operación', value: p.operation }, { label: 'Ambientes', value: p.rooms ?? '—' }, { label: 'Dormitorios', value: p.bedrooms ?? '—' },
                { label: 'Baños', value: p.bathrooms ?? '—' }, { label: 'Superficie', value: p.sqm ? `${p.sqm} m²` : '—' }, { label: 'Expensas', value: p.expenses ? money(p.expenses,currency) : '—' },
                { label: 'Agente', value: p.agent?.name || 'Sin asignar' }, { label: 'Captación', value: p.captureSource || '—' }, { label: 'Disponible desde', value: date(p.availableFrom) },
              ]} />
            </SectionCard>
            <SectionCard title="Contrato vigente" subtitle="Estado contractual actual">
              {activeLease ? <DetailGrid items={[
                { label: 'Inquilino', value: `${activeLease.renter.firstName} ${activeLease.renter.lastName}` },
                { label: 'DNI', value: activeLease.renter.dni }, { label: 'Vigencia', value: `${date(activeLease.startDate)} → ${date(activeLease.endDate)}` },
                { label: 'Alquiler', value: money(activeLease.currentRent,currency) }, { label: 'Próximo ajuste', value: date(activeLease.nextAdjustmentDate) },
                { label: 'Método ajuste', value: activeLease.adjustmentMethod || '—' }, { label: 'Garantía', value: activeLease.guaranteeType || '—' },
                { label: 'Garante', value: name(activeLease.guarantor) },
              ]} /> : <EmptyState>La propiedad no tiene un contrato vigente.</EmptyState>}
            </SectionCard>
            <SectionCard title="Propietarios" subtitle="Titularidad vigente" action={<a href="#propietarios" className="text-xs font-semibold text-indigo-600">Ver detalle</a>}>
              <div className="space-y-3">{p.owners.length ? p.owners.map((owner:any) => <Link key={owner.id} href={`/contactos/${owner.contactId}`} className="block rounded-xl border border-slate-200 p-3 hover:border-indigo-200 hover:bg-indigo-50/40"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">{name(owner.contact)}</p><p className="text-xs text-slate-500 mt-0.5">{owner.contact.cuit || owner.contact.documentNumber || 'Sin identificación fiscal'}</p></div><span className="font-mono font-bold text-indigo-700">{Number(owner.ownershipPercentage).toFixed(2)}%</span></div></Link>) : <EmptyState>Sin propietarios relacionados.</EmptyState>}</div>
            </SectionCard>
          </div>
        </section>

        <SectionCard id="comercial" title="Comercial" subtitle="Publicaciones, interesados, visitas, reservas y operaciones">
          <div className="grid lg:grid-cols-4 gap-3 mb-5">
            <MetricCard label="Interesados" value={p.leadPropertyInterests.length} />
            <MetricCard label="Visitas/eventos" value={p.calendarEvents.length} />
            <MetricCard label="Reservas" value={p.reservations.length} />
            <MetricCard label="Operaciones" value={p.deals.length} />
          </div>
          <div className="space-y-5">
            <DataTable headers={['Lead / contacto','Estado','Score','Agente','Actualizado']} rows={p.leadPropertyInterests.map((interest:any) => [
              <div key="lead"><p className="font-semibold">{interest.lead.title}</p><p className="text-xs text-slate-400">{name(interest.lead.contact)}</p></div>,
              <StatusPill key="status" tone={tone(interest.lead.status)}>{interest.lead.status}</StatusPill>,
              interest.score,
              interest.lead.agent?.name || '—',
              date(interest.updatedAt),
            ])} />
            <DataTable headers={['Fecha','Evento','Contacto','Agente','Estado']} rows={p.calendarEvents.map((event:any) => [date(event.startsAt),event.title,name(event.contact),event.agent?.name || '—',<StatusPill key="s" tone={tone(event.status)}>{event.status}</StatusPill>])} />
            <DataTable headers={['Operación','Contacto','Importe','Agente','Estado']} rows={p.deals.map((deal:any) => [deal.operation,name(deal.contact),deal.amount ? money(deal.amount,deal.currency) : '—',deal.agent?.name || '—',<StatusPill key="s" tone={tone(deal.status)}>{deal.status}</StatusPill>])} />
          </div>
        </SectionCard>

        <SectionCard id="contratos" title="Contratos e historial" subtitle="Toda la vida contractual de la propiedad">
          <DataTable headers={['Inquilino','Vigencia','Alquiler','Ajuste','Estado','Deuda']} rows={leases.map((lease:any) => {
            const debt = (lease.debts || []).reduce((sum:number,d:any)=>sum+Math.max(0,Number(d.amount)-Number(d.paidAmount)),0);
            return [`${lease.renter.firstName} ${lease.renter.lastName}`,`${date(lease.startDate)} → ${date(lease.endDate)}`,money(lease.currentRent,currency),date(lease.nextAdjustmentDate),<StatusPill key="s" tone={tone(lease.status)}>{lease.status}</StatusPill>,money(debt,currency)];
          })} />
        </SectionCard>

        <SectionCard id="cuenta" title="Cuenta corriente y economía" subtitle="Deuda, pagos, gastos, liquidaciones y movimientos financieros">
          <div className="grid lg:grid-cols-3 gap-3 mb-5"><MetricCard label="Pendiente" value={money(pendingDebt,currency)} /><MetricCard label="Gastos cargados" value={money(expenses,currency)} /><MetricCard label="Costo mantenimiento" value={money(maintenanceCost,currency)} /></div>
          <div className="space-y-5">
            <DataTable headers={['Concepto','Vencimiento','Total','Pagado','Saldo','Estado']} rows={allDebts.map((debt:any)=>[debt.description,date(debt.dueDate),money(debt.amount,currency),money(debt.paidAmount,currency),money(Math.max(0,Number(debt.amount)-Number(debt.paidAmount)),currency),<StatusPill key="s" tone={tone(debt.status)}>{debt.status}</StatusPill>])} />
            <DataTable headers={['Gasto','Proveedor','Importe','Fecha','Estado']} rows={p.propertyExpenses.map((expense:any)=>[expense.description,name(expense.provider),money(expense.amount,currency),date(expense.paidAt || expense.dueDate || expense.createdAt),<StatusPill key="s" tone={tone(expense.status)}>{expense.status}</StatusPill>])} />
            <DataTable headers={['Movimiento','Cuenta','Importe','Fecha','Conciliación']} rows={(data.financialMovements as any[]).map((movement:any)=>[movement.concept,movement.accountName,money(movement.amount,movement.currency),date(movement.occurredAt),<StatusPill key="s" tone={tone(movement.reconciliationStatus)}>{movement.reconciliationStatus}</StatusPill>])} />
          </div>
        </SectionCard>

        <SectionCard id="propietarios" title="Propietarios y liquidaciones" subtitle="Titularidad y rendición económica">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-3">{p.owners.map((owner:any)=><Link key={owner.id} href={`/contactos/${owner.contactId}`} className="block rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"><div className="flex justify-between gap-3"><div><p className="font-bold text-slate-900">{name(owner.contact)}</p><p className="text-sm text-slate-500">{owner.contact.email || owner.contact.phone || 'Sin contacto'}</p></div><div className="text-right"><p className="font-mono font-bold text-indigo-700">{Number(owner.ownershipPercentage).toFixed(2)}%</p>{owner.isPrimary && <span className="text-[10px] font-bold uppercase text-slate-400">Principal</span>}</div></div></Link>)}</div>
            <DataTable headers={['Período','Propietario','Neto','Estado']} rows={p.settlementLines.map((line:any)=>[`${date(line.settlement.periodStart)} → ${date(line.settlement.periodEnd)}`,name(line.settlement.owner),money(line.settlement.netAmount,currency),<StatusPill key="s" tone={tone(line.settlement.status)}>{line.settlement.status}</StatusPill>])} />
          </div>
        </SectionCard>

        <SectionCard id="mantenimiento" title="Mantenimiento e inspecciones" subtitle="Órdenes, costos, proveedores y estado técnico">
          <div className="grid lg:grid-cols-2 gap-5">
            <DataTable headers={['Orden','Proveedor','Prioridad','Costo','Estado']} rows={p.maintenanceRequests.map((request:any)=>[<div key="o"><p className="font-semibold">{request.title}</p><p className="text-xs text-slate-400">{request.category}</p></div>,name(request.provider),<StatusPill key="p" tone={tone(request.priority)}>{request.priority}</StatusPill>,money(request.actualCost || request.approvedAmount || request.quotedAmount || 0,currency),<StatusPill key="s" tone={tone(request.status)}>{request.status}</StatusPill>])} />
            <DataTable headers={['Tipo','Fecha','Inspector','Hallazgos','Estado']} rows={p.inspections.map((inspection:any)=>[inspection.type,date(inspection.performedAt || inspection.scheduledAt),inspection.inspector?.name || '—',inspection.findings.length,<StatusPill key="s" tone={tone(inspection.status)}>{inspection.status}</StatusPill>])} />
          </div>
        </SectionCard>

        <SectionCard id="documentos" title="Documentos" subtitle="Documentación vinculada directa y contractualmente">
          <DataTable headers={['Documento','Categoría','Fecha','Acción']} rows={p.documents.map((document:any)=>[document.fileName,document.category,date(document.uploadedAt),<a key="open" href={document.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold">Abrir</a>])} />
        </SectionCard>

        <SectionCard id="comunicaciones" title="Comunicaciones" subtitle="Hilos vinculados con esta propiedad" action={<Link href="/comunicaciones" className="btn-secondary"><MessageSquare className="w-4 h-4" /> Abrir inbox</Link>}>
          <DataTable headers={['Asunto','Mensajes','Última actividad','Estado']} rows={(data.communications as any[]).map((thread:any)=>[thread.subject,Number(thread.messageCount || 0),date(thread.lastMessageAt || thread.updatedAt),<StatusPill key="s" tone={tone(thread.status)}>{thread.status}</StatusPill>])} />
        </SectionCard>

        <SectionCard id="actividad" title="Actividad 360" subtitle="Timeline transversal de todos los módulos">
          <Timeline items={(data.activity as any[]).map((event:any)=>({id:event.id,title:event.title,detail:event.description,date:event.createdAt,actor:event.actorName}))} />
        </SectionCard>
      </div>
    </div>
  );
}
