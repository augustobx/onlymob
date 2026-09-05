import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Banknote, Building2, CalendarClock, ClipboardCheck, FileText, MessageSquare, ShieldCheck, UserRound, Wrench } from 'lucide-react';
import { getMaintenance360Action } from '@/actions/maintenance-360';
import { DataTable, DetailGrid, EntityHero, MetricCard, SectionCard, StatusPill, Timeline } from '@/components/entity-360/entity-360-ui';

export const dynamic = 'force-dynamic';

const money = (value: unknown, currency = 'ARS') => value == null ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value));
const date = (value: unknown) => value ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(String(value))) : '—';
const name = (person: any) => person ? (person.companyName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || '—') : '—';
function tone(status?: string): 'neutral'|'success'|'warning'|'danger'|'info' {
  if (!status) return 'neutral';
  if (['RESOLVED','COMPLETED','PAID','MATCHED','APPROVED'].includes(status)) return 'success';
  if (['CANCELED','FAILED','CRITICAL'].includes(status)) return 'danger';
  if (['URGENT','HIGH','WAITING_PARTS','PENDING','PARTIAL','OVERDUE'].includes(status)) return 'warning';
  return 'info';
}

export default async function Maintenance360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data: any = await getMaintenance360Action(id);
  if (!data) notFound();

  const r = data.request;
  const cost = Number(r.actualCost || r.approvedAmount || r.quotedAmount || 0);
  const leaseDebt = (r.propertyLease?.debts || []).reduce((sum: number, debt: any) => sum + Math.max(0, Number(debt.amount) - Number(debt.paidAmount)), 0);
  const relatedInspections = Array.from(new Map((r.findings || []).map((finding: any) => [finding.inspection.id, finding.inspection])).values()) as any[];

  return (
    <div className="app-page">
      <div className="page-container space-y-6">
        <Link href="/mantenimiento" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Mantenimiento</Link>

        <EntityHero
          eyebrow="Mantenimiento 360"
          title={r.title}
          subtitle={`${r.property.code} · ${r.property.address}`}
          badges={[
            { label: r.status, tone: tone(r.status) },
            { label: r.priority, tone: tone(r.priority) },
            { label: r.category, tone: 'neutral' },
            { label: r.costBearer, tone: 'info' },
          ]}
          actions={<>
            <Link href={`/propiedades/${r.propertyId}`} className="btn-primary"><Building2 className="w-4 h-4" /> Propiedad 360</Link>
            {r.propertyLeaseId && <Link href={`/contratos/${r.propertyLeaseId}`} className="btn-secondary"><FileText className="w-4 h-4" /> Contrato 360</Link>}
          </>}
          media={<div className="entity-hero__placeholder"><Wrench className="w-12 h-12" /><span>Orden técnica</span></div>}
        />

        <nav className="entity-subnav" aria-label="Secciones mantenimiento 360">
          {[
            ['resumen','Resumen'],['seguimiento','Seguimiento'],['inspecciones','Inspecciones'],['documentos','Documentos'],['comunicaciones','Comunicaciones'],['economia','Economía'],['actividad','Actividad'],
          ].map(([href,label]) => <a key={href} href={`#${href}`} className="entity-subnav__link">{label}</a>)}
        </nav>

        <section id="resumen" className="scroll-mt-28 space-y-5">
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            <MetricCard label="Costo" value={money(cost)} detail={r.actualCost ? 'Costo real' : r.approvedAmount ? 'Importe aprobado' : 'Presupuesto'} icon={<Banknote className="w-5 h-5" />} />
            <MetricCard label="Proveedor" value={name(r.provider)} detail={r.provider?.phone || 'Sin asignar'} icon={<Wrench className="w-5 h-5" />} />
            <MetricCard label="Responsable" value={r.assignedUser?.name || 'Sin asignar'} detail={r.assignedUser?.email || 'Equipo interno'} icon={<UserRound className="w-5 h-5" />} />
            <MetricCard label="Programado" value={date(r.scheduledAt)} detail={r.promisedAt ? `Prometido ${date(r.promisedAt)}` : 'Sin fecha prometida'} icon={<CalendarClock className="w-5 h-5" />} />
            <MetricCard label="Saldo contrato" value={money(leaseDebt)} detail={r.propertyLease ? r.propertyLease.status : 'Sin contrato vinculado'} icon={<Banknote className="w-5 h-5" />} />
          </div>

          <div className="grid xl:grid-cols-3 gap-5">
            <SectionCard title="Orden" subtitle="Datos técnicos y económicos">
              <DetailGrid items={[
                { label: 'Categoría', value: r.category }, { label: 'Prioridad', value: r.priority }, { label: 'Estado', value: r.status },
                { label: 'Reportado por', value: r.reportedBy || '—' }, { label: 'Presupuesto', value: money(r.quotedAmount) }, { label: 'Aprobado', value: money(r.approvedAmount) },
                { label: 'Costo real', value: money(r.actualCost) }, { label: 'Absorbe costo', value: r.costBearer }, { label: 'Aprobación propietario', value: date(r.ownerApprovedAt) },
                { label: 'Inicio', value: date(r.startedAt) }, { label: 'Resolución', value: date(r.resolvedAt) }, { label: 'Creada', value: date(r.createdAt) },
              ]} />
            </SectionCard>
            <SectionCard title="Descripción" subtitle="Problema y resolución">
              <div className="space-y-4 text-sm text-slate-600"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Detalle</p><p className="whitespace-pre-wrap">{r.description}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Resolución</p><p className="whitespace-pre-wrap">{r.resolutionNotes || 'Todavía sin notas de resolución.'}</p></div></div>
            </SectionCard>
            <SectionCard title="Personas vinculadas" subtitle="Inquilino, proveedor y propietarios">
              <div className="space-y-3">
                {r.renter && <div className="rounded-xl border p-3"><p className="text-[10px] uppercase font-bold text-slate-400">Inquilino</p><p className="font-semibold mt-1">{`${r.renter.firstName} ${r.renter.lastName}`}</p><p className="text-xs text-slate-500">DNI {r.renter.dni} · {r.renter.phone || r.renter.email || 'Sin contacto'}</p></div>}
                {r.provider && <Link href={`/contactos/${r.provider.id}`} className="block rounded-xl border p-3 hover:bg-slate-50"><p className="text-[10px] uppercase font-bold text-slate-400">Proveedor</p><p className="font-semibold mt-1 text-indigo-600">{name(r.provider)}</p><p className="text-xs text-slate-500">{r.provider.phone || r.provider.email || 'Sin contacto'}</p></Link>}
                {(r.property.owners || []).map((owner: any) => <Link key={owner.id} href={`/contactos/${owner.contactId}`} className="flex items-center justify-between rounded-xl border p-3 hover:bg-slate-50"><div><p className="text-[10px] uppercase font-bold text-slate-400">Propietario</p><p className="font-semibold text-indigo-600">{name(owner.contact)}</p></div><span className="font-mono text-xs">{Number(owner.ownershipPercentage).toFixed(2)}%</span></Link>)}
              </div>
            </SectionCard>
          </div>
        </section>

        <SectionCard id="seguimiento" title="Seguimiento técnico" subtitle="Historial de cambios de estado y notas">
          <DataTable headers={['Fecha','Cambio','Nota','Usuario']} rows={(r.events || []).map((event: any) => [date(event.createdAt),`${event.fromStatus || '—'} → ${event.toStatus || '—'}`,event.note || '—',event.actor?.name || 'Sistema'])} />
        </SectionCard>

        <SectionCard id="inspecciones" title="Inspecciones y hallazgos" subtitle="Evidencia técnica relacionada con la orden">
          <div className="grid xl:grid-cols-2 gap-5">
            <DataTable headers={['Inspección','Fecha','Inspector','Estado']} rows={relatedInspections.map((inspection: any) => [inspection.type,date(inspection.performedAt || inspection.scheduledAt),inspection.inspector?.name || '—',<StatusPill key="s" tone={tone(inspection.status)}>{inspection.status}</StatusPill>])} />
            <DataTable headers={['Área','Hallazgo','Severidad','Resuelto']} rows={(r.findings || []).map((finding: any) => [finding.area || '—',finding.description,<StatusPill key="s" tone={tone(finding.severity)}>{finding.severity}</StatusPill>,finding.resolved ? 'Sí' : 'No'])} />
          </div>
        </SectionCard>

        <SectionCard id="documentos" title="Documentos" subtitle="Presupuestos, comprobantes, fotos y documentación técnica">
          <DataTable headers={['Archivo','Categoría','Fecha','Estado','Acción']} rows={(r.documents || []).map((doc: any) => [doc.fileName,doc.category,date(doc.uploadedAt),<StatusPill key="s" tone={tone(doc.workflowStatus)}>{doc.workflowStatus || 'ARCHIVED'}</StatusPill>,<a key="o" href={doc.fileUrl} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600">Abrir</a>])} />
        </SectionCard>

        <SectionCard id="comunicaciones" title="Comunicaciones" subtitle="Conversaciones asociadas a la propiedad o inquilino">
          <DataTable headers={['Asunto','Mensajes','Última actividad','Estado']} rows={(data.communications || []).map((thread: any) => [thread.subject,Number(thread.messageCount || 0),date(thread.lastMessageAt || thread.updatedAt),<StatusPill key="s" tone={tone(thread.status)}>{thread.status}</StatusPill>])} />
        </SectionCard>

        <SectionCard id="economia" title="Contexto financiero" subtitle="Movimientos de la propiedad durante la gestión técnica">
          <DataTable headers={['Fecha','Cuenta','Movimiento','Importe','Conciliación']} rows={(data.financial || []).map((movement: any) => [date(movement.occurredAt),movement.accountName,movement.concept,money(movement.amount,movement.currency),<StatusPill key="s" tone={tone(movement.reconciliationStatus)}>{movement.reconciliationStatus}</StatusPill>])} />
        </SectionCard>

        <SectionCard id="actividad" title="Actividad 360" subtitle="Timeline transversal de la orden y la propiedad">
          <Timeline items={(data.activity || []).map((event: any) => ({ id: event.id, title: event.title, detail: event.description, date: event.createdAt, actor: event.actorName }))} />
        </SectionCard>
      </div>
    </div>
  );
}
