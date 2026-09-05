import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FileText,
  KeyRound,
  MapPin,
  MessageSquare,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Wrench,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import { getProperty360Action } from '@/actions/entity-360';
import { DataTable, EmptyState, StatusPill, Timeline } from '@/components/entity-360/entity-360-ui';
import { Property360Actions } from './property-360-actions';
import styles from './property-360.module.css';

export const dynamic = 'force-dynamic';

const money = (value: unknown, currency = 'ARS') => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(Number(value || 0));

const date = (value: unknown) => value
  ? new Intl.DateTimeFormat('es-AR').format(new Date(String(value)))
  : '—';

const name = (person: any) => person
  ? (person.companyName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Sin nombre')
  : '—';

const month = (value: Date | null) => value
  ? new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(value)
  : 'Sin programar';

function tone(status?: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (!status) return 'neutral';
  if (['CURRENT', 'PAID', 'PUBLISHED', 'WON', 'RESOLVED', 'COMPLETED', 'AVAILABLE', 'DELIVERED', 'ALQUILADO'].includes(status)) return 'success';
  if (['OVERDUE', 'CANCELED', 'LOST', 'ARCHIVED', 'FAILED'].includes(status)) return 'danger';
  if (['PENDING', 'PARTIAL', 'EXPIRING', 'RESERVED', 'URGENT', 'HIGH', 'UNDER_NEGOTIATION', 'MANTENIMIENTO'].includes(status)) return 'warning';
  return 'info';
}

function addMonths(dateValue: Date, months: number) {
  const next = new Date(dateValue);
  next.setHours(12, 0, 0, 0);
  next.setMonth(next.getMonth() + months);
  return next;
}

function inferNextAdjustment(lease: any): Date | null {
  if (!lease) return null;
  if (lease.nextAdjustmentDate) return new Date(lease.nextAdjustmentDate);

  const period = Number(lease.updatePeriodMonths || 0);
  if (!period) return null;
  const history = lease.rentHistory || [];

  if (history.length && history[0]?.changeDate) {
    return addMonths(new Date(history[0].changeDate), period);
  }

  const start = new Date(lease.startDate);
  if (Number.isNaN(start.getTime())) return null;
  let candidate = addMonths(start, period);
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0);
  while (candidate < currentMonthStart) candidate = addMonths(candidate, period);
  return candidate;
}

function daysUntil(value: Date | null) {
  if (!value) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const target = new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function adjustmentHeadline(nextAdjustment: Date | null) {
  if (!nextAdjustment) return 'Sin fecha de aumento';
  const diff = daysUntil(nextAdjustment);
  const now = new Date();
  const sameMonth = nextAdjustment.getMonth() === now.getMonth() && nextAdjustment.getFullYear() === now.getFullYear();
  if (diff !== null && diff < 0) return `Aumento pendiente desde ${date(nextAdjustment)}`;
  if (sameMonth) return 'Aumenta este mes';
  if (diff !== null && diff <= 30) return `Aumenta en ${diff} días`;
  return `Aumenta en ${month(nextAdjustment)}`;
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProperty360Action(id);
  if (!data) notFound();

  const p: any = data.property;
  const leases = p.propertyLeases || [];
  const activeLease = leases.find((lease: any) => ['CURRENT', 'EXPIRING'].includes(lease.status)) || null;
  const allDebts = leases.flatMap((lease: any) => lease.debts || []);
  const openDebts = allDebts
    .filter((debt: any) => debt.status !== 'PAID' && Number(debt.amount || 0) - Number(debt.paidAmount || 0) > 0)
    .map((debt: any) => ({
      id: debt.id,
      description: debt.description,
      remaining: Math.max(0, Number(debt.amount || 0) - Number(debt.paidAmount || 0)),
      dueDate: String(debt.dueDate),
      status: debt.status,
    }));
  const allPayments = allDebts.flatMap((debt: any) => debt.payments || []);
  const pendingDebt = openDebts.reduce((sum: number, debt: any) => sum + debt.remaining, 0);
  const collected = allPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
  const expenses = (p.propertyExpenses || []).reduce((sum: number, expense: any) => sum + Number(expense.amount || 0), 0);
  const maintenanceCost = (p.maintenanceRequests || []).reduce((sum: number, request: any) => sum + Number(request.actualCost || request.approvedAmount || request.quotedAmount || 0), 0);
  const openMaintenance = (p.maintenanceRequests || []).filter((request: any) => !['RESOLVED', 'CANCELED'].includes(request.status));
  const activePublications = (p.publications || []).filter((publication: any) => publication.status === 'PUBLISHED');
  const currency = p.currency || 'ARS';
  const nextAdjustment = inferNextAdjustment(activeLease);
  const adjustmentDays = daysUntil(nextAdjustment);
  const effectiveEnd = activeLease ? new Date(activeLease.extensionUntil || activeLease.endDate) : null;
  const contractDays = daysUntil(effectiveEnd);
  const lastIncrease = activeLease?.rentHistory?.[0] || null;
  const contractDocs = activeLease?.documents || [];
  const primaryOwner = p.owners?.find((owner: any) => owner.isPrimary) || p.owners?.[0] || null;

  const adjustmentAlertClass = adjustmentDays !== null && adjustmentDays < 0
    ? styles.alertDanger
    : adjustmentDays !== null && adjustmentDays <= 30
      ? styles.alertWarning
      : styles.alertInfo;
  const contractAlertClass = contractDays !== null && contractDays < 0
    ? styles.alertDanger
    : contractDays !== null && contractDays <= 60
      ? styles.alertWarning
      : styles.alertSuccess;

  const nav = [
    ['operacion', 'Operación'],
    ['cuenta', 'Cuenta corriente'],
    ['aumentos', 'Aumentos'],
    ['propietarios', 'Propietarios'],
    ['mantenimiento', 'Mantenimiento'],
    ['documentos', 'Documentos'],
    ['comercial', 'Comercial'],
    ['actividad', 'Actividad'],
  ];

  return (
    <div className="app-page">
      <div className={`page-container ${styles.page}`}>
        <Link href="/propiedades" className={styles.back}><ArrowLeft className="h-4 w-4" /> Volver a propiedades</Link>

        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <div>
                <div className={styles.heroEyebrow}><Building2 className="h-4 w-4" /> Propiedad 360 · Código {p.code}</div>
                <h1 className={styles.heroTitle}>{p.address}</h1>
                <p className={styles.heroLocation}><MapPin className="h-4 w-4" /> {[p.city, p.province].filter(Boolean).join(', ') || 'Ubicación no especificada'}</p>
                <div className={styles.heroBadges}>
                  <span className={`${styles.heroBadge} ${p.status === 'ALQUILADO' ? styles.heroBadgeStrong : ''}`}>{p.status}</span>
                  <span className={styles.heroBadge}>{p.type}</span>
                  <span className={styles.heroBadge}>{p.operation === 'RENT' ? 'ALQUILER' : p.operation}</span>
                  {pendingDebt > 0 && <span className={styles.heroBadge}>CON SALDO PENDIENTE</span>}
                </div>
              </div>

              <div className={styles.heroStats}>
                <div className={styles.heroStat}><span className={styles.heroStatLabel}>Alquiler actual</span><strong className={styles.heroStatValue}>{activeLease ? money(activeLease.currentRent, currency) : 'Sin contrato'}</strong></div>
                <div className={styles.heroStat}><span className={styles.heroStatLabel}>Inquilino</span><strong className={styles.heroStatValue}>{activeLease ? `${activeLease.renter.firstName} ${activeLease.renter.lastName}` : '—'}</strong></div>
                <div className={styles.heroStat}><span className={styles.heroStatLabel}>Próximo aumento</span><strong className={styles.heroStatValue}>{nextAdjustment ? month(nextAdjustment) : 'Sin programar'}</strong></div>
                <div className={styles.heroStat}><span className={styles.heroStatLabel}>Contrato hasta</span><strong className={styles.heroStatValue}>{effectiveEnd ? date(effectiveEnd) : '—'}</strong></div>
              </div>
            </div>

            <div className={styles.heroMedia}>
              {p.coverImageUrl
                ? <img src={p.coverImageUrl} alt={p.address} />
                : <div className={styles.heroPlaceholder}><Building2 className="h-14 w-14" /><span>Ficha operativa</span></div>}
            </div>
          </div>
        </section>

        <section className={styles.actionsBar} aria-label="Acciones rápidas de la propiedad">
          <Property360Actions
            propertyId={p.id}
            currency={currency}
            lease={activeLease ? {
              id: activeLease.id,
              currentRent: Number(activeLease.currentRent),
              updatePeriodMonths: Number(activeLease.updatePeriodMonths || 4),
              adjustmentIndex: activeLease.adjustmentIndex,
              adjustmentMethod: activeLease.adjustmentMethod,
              increasePercent: Number(activeLease.increasePercent || 0),
            } : null}
            openDebts={openDebts}
          />
        </section>

        <section className={styles.alerts} aria-label="Alertas operativas">
          <div className={`${styles.alert} ${activeLease ? adjustmentAlertClass : styles.alertInfo}`}>
            <div className={styles.alertIcon}><CalendarClock className="h-5 w-5" /></div>
            <div><span className={styles.alertLabel}>Próximo aumento</span><div className={styles.alertTitle}>{activeLease ? adjustmentHeadline(nextAdjustment) : 'Sin contrato vigente'}</div><p className={styles.alertDetail}>{nextAdjustment ? `${date(nextAdjustment)} · cada ${activeLease.updatePeriodMonths} meses · ${activeLease.adjustmentIndex || activeLease.adjustmentMethod || 'Ajuste contractual'}` : 'No hay una fecha de actualización contractual disponible.'}</p></div>
          </div>

          <div className={`${styles.alert} ${activeLease ? contractAlertClass : styles.alertInfo}`}>
            <div className={styles.alertIcon}><FileText className="h-5 w-5" /></div>
            <div><span className={styles.alertLabel}>Contrato</span><div className={styles.alertTitle}>{activeLease ? (contractDays !== null && contractDays < 0 ? 'Contrato vencido' : contractDays !== null && contractDays <= 60 ? `Vence en ${contractDays} días` : 'Contrato vigente') : 'Sin contrato vigente'}</div><p className={styles.alertDetail}>{activeLease ? `${date(activeLease.startDate)} → ${date(effectiveEnd)} · ${activeLease.renter.firstName} ${activeLease.renter.lastName}` : 'La propiedad está disponible para una nueva contratación.'}</p></div>
          </div>

          <div className={`${styles.alert} ${pendingDebt > 0 ? styles.alertDanger : styles.alertSuccess}`}>
            <div className={styles.alertIcon}><CircleDollarSign className="h-5 w-5" /></div>
            <div><span className={styles.alertLabel}>Cobranza</span><div className={styles.alertTitle}>{pendingDebt > 0 ? `${money(pendingDebt, currency)} pendientes` : 'Al día'}</div><p className={styles.alertDetail}>{pendingDebt > 0 ? `${openDebts.length} concepto${openDebts.length === 1 ? '' : 's'} con saldo.` : 'No hay cargos pendientes para esta propiedad.'}</p></div>
          </div>

          <div className={`${styles.alert} ${openMaintenance.length ? styles.alertWarning : styles.alertSuccess}`}>
            <div className={styles.alertIcon}><Wrench className="h-5 w-5" /></div>
            <div><span className={styles.alertLabel}>Mantenimiento</span><div className={styles.alertTitle}>{openMaintenance.length ? `${openMaintenance.length} orden${openMaintenance.length === 1 ? '' : 'es'} abierta${openMaintenance.length === 1 ? '' : 's'}` : 'Sin pendientes'}</div><p className={styles.alertDetail}>{openMaintenance.length ? 'Hay trabajos que requieren seguimiento.' : 'No hay mantenimiento abierto para el inmueble.'}</p></div>
          </div>
        </section>

        <nav className={styles.sectionNav} aria-label="Navegación Propiedad 360">
          {nav.map(([href, label]) => <a key={href} href={`#${href}`}>{label}</a>)}
        </nav>

        <section id="operacion" className={`${styles.operationalGrid} scroll-mt-28`}>
          <div className={styles.contractCard}>
            <div className={styles.contractTop}>
              <div>
                <div className={styles.contractKicker}>Contrato vigente</div>
                <h2 className={styles.contractTitle}>{activeLease ? `${activeLease.renter.firstName} ${activeLease.renter.lastName}` : 'Propiedad sin contrato vigente'}</h2>
                <p className={styles.contractSubtitle}>{activeLease ? `DNI ${activeLease.renter.dni} · ${activeLease.renter.phone || activeLease.renter.email || 'sin contacto cargado'}` : 'Cuando se genere un contrato, esta será la tarjeta principal de operación.'}</p>
              </div>
              {activeLease && <StatusPill tone={tone(activeLease.status)}>{activeLease.status === 'CURRENT' ? 'VIGENTE' : activeLease.status}</StatusPill>}
            </div>

            <div className={styles.contractBody}>
              {activeLease ? <>
                <div className={styles.contractNumbers}>
                  <div className={`${styles.numberCard} ${styles.numberIndigo}`}><span>Alquiler actual</span><strong>{money(activeLease.currentRent, currency)}</strong><small>Valor vigente del contrato</small></div>
                  <div className={`${styles.numberCard} ${styles.numberAmber}`}><span>Próximo aumento</span><strong>{nextAdjustment ? month(nextAdjustment) : 'Sin fecha'}</strong><small>{nextAdjustment ? date(nextAdjustment) : `Cada ${activeLease.updatePeriodMonths} meses`}</small></div>
                  <div className={`${styles.numberCard} ${pendingDebt > 0 ? styles.numberRose : ''}`}><span>Saldo pendiente</span><strong>{money(pendingDebt, currency)}</strong><small>{openDebts.length ? `${openDebts.length} cargos abiertos` : 'Cuenta al día'}</small></div>
                </div>

                <div className={styles.contractDetails}>
                  <div className={styles.contractDetail}><span>Vigencia</span><strong>{date(activeLease.startDate)} → {date(effectiveEnd)}</strong></div>
                  <div className={styles.contractDetail}><span>Ajuste</span><strong>{activeLease.adjustmentIndex || activeLease.adjustmentMethod || 'Ajuste contractual'} · cada {activeLease.updatePeriodMonths} meses</strong></div>
                  <div className={styles.contractDetail}><span>Último aumento</span><strong>{lastIncrease ? `${date(lastIncrease.changeDate)} · ${money(lastIncrease.oldRent, currency)} → ${money(lastIncrease.newRent, currency)}` : 'Sin historial registrado'}</strong></div>
                  <div className={styles.contractDetail}><span>Garantía</span><strong>{activeLease.guaranteeType || 'Sin especificar'}{activeLease.guarantor ? ` · ${name(activeLease.guarantor)}` : ''}</strong></div>
                  <div className={styles.contractDetail}><span>Depósito</span><strong>{money(activeLease.deposit, currency)}</strong></div>
                  <div className={styles.contractDetail}><span>Documentación</span><strong>{contractDocs.length ? `${contractDocs.length} documento${contractDocs.length === 1 ? '' : 's'} vinculado${contractDocs.length === 1 ? '' : 's'}` : 'Sin documento adjunto'}</strong></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/contratos/${activeLease.id}`} className="btn-primary"><FileText className="h-4 w-4" /> Abrir contrato 360</Link>
                  <a href="#aumentos" className="btn-secondary"><CalendarClock className="h-4 w-4" /> Historial de aumentos</a>
                  <a href="#cuenta" className="btn-secondary"><ReceiptText className="h-4 w-4" /> Ver cuenta corriente</a>
                </div>
              </> : <EmptyState>No hay contrato vigente para esta propiedad.</EmptyState>}
            </div>
          </div>

          <aside className={styles.focusCard}>
            <h2 className={styles.focusTitle}>Lo importante hoy</h2>
            <p className={styles.focusSubtitle}>Datos que deberían decidir tu próxima acción sin buscar por toda la ficha.</p>
            <div className={styles.focusList}>
              <div className={styles.focusItem}><div className={styles.focusItemIcon}><CalendarClock className="h-5 w-5" /></div><div><strong>Próximo aumento</strong><span>{nextAdjustment ? date(nextAdjustment) : 'Sin programar'}</span></div><div className={styles.focusValue}>{activeLease ? adjustmentHeadline(nextAdjustment) : '—'}</div></div>
              <div className={styles.focusItem}><div className={styles.focusItemIcon}><Clock3 className="h-5 w-5" /></div><div><strong>Fin de contrato</strong><span>{effectiveEnd ? date(effectiveEnd) : 'Sin contrato'}</span></div><div className={styles.focusValue}>{contractDays === null ? '—' : contractDays < 0 ? 'Vencido' : `${contractDays} días`}</div></div>
              <div className={styles.focusItem}><div className={styles.focusItemIcon}><Banknote className="h-5 w-5" /></div><div><strong>Cuenta corriente</strong><span>{openDebts.length ? `${openDebts.length} cargos con saldo` : 'Sin deuda'}</span></div><div className={styles.focusValue}>{money(pendingDebt, currency)}</div></div>
              <div className={styles.focusItem}><div className={styles.focusItemIcon}><UserRound className="h-5 w-5" /></div><div><strong>Propietario principal</strong><span>{primaryOwner?.contact?.phone || primaryOwner?.contact?.email || 'Sin contacto'}</span></div><div className={styles.focusValue}>{primaryOwner ? name(primaryOwner.contact) : '—'}</div></div>
            </div>
          </aside>
        </section>

        <div className={styles.sectionGrid}>
          <section id="cuenta" className={`${styles.coloredSection} scroll-mt-28`}>
            <div className={`${styles.coloredHeader} ${pendingDebt > 0 ? styles.headerRose : styles.headerGreen}`}><div><h2>Cuenta corriente</h2><p>Alquileres, cargos, pagos y saldos de esta propiedad</p></div><CircleDollarSign className="h-5 w-5 text-slate-500" /></div>
            <div className={styles.coloredBody}>
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Pendiente</p><p className={`mt-1 text-lg font-black ${pendingDebt > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{money(pendingDebt, currency)}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Cobrado</p><p className="mt-1 text-lg font-black text-slate-900">{money(collected, currency)}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Movimientos</p><p className="mt-1 text-lg font-black text-slate-900">{(data.financialMovements as any[]).length}</p></div>
              </div>
              <DataTable headers={['Concepto', 'Vencimiento', 'Total', 'Saldo', 'Estado']} rows={allDebts.slice(0, 12).map((debt: any) => [debt.description, date(debt.dueDate), money(debt.amount, currency), money(Math.max(0, Number(debt.amount) - Number(debt.paidAmount)), currency), <StatusPill key="s" tone={tone(debt.status)}>{debt.status}</StatusPill>])} />
            </div>
          </section>

          <section id="aumentos" className={`${styles.coloredSection} scroll-mt-28`}>
            <div className={`${styles.coloredHeader} ${styles.headerAmber}`}><div><h2>Aumentos del alquiler</h2><p>Cronograma contractual e historial aplicado</p></div><CalendarClock className="h-5 w-5 text-amber-700" /></div>
            <div className={styles.coloredBody}>
              {activeLease ? <>
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-amber-700">Próximo ajuste</p><p className="mt-1 text-xl font-black text-amber-950">{adjustmentHeadline(nextAdjustment)}</p><p className="mt-1 text-xs text-amber-800">{nextAdjustment ? `${date(nextAdjustment)} · ${activeLease.adjustmentIndex || activeLease.adjustmentMethod || 'Ajuste contractual'}` : `Periodicidad: ${activeLease.updatePeriodMonths} meses`}</p></div><div className="rounded-xl bg-white/75 px-4 py-3 text-right"><span className="block text-[9px] font-black uppercase text-amber-600">Frecuencia</span><strong className="text-lg text-amber-950">{activeLease.updatePeriodMonths} meses</strong></div></div>
                </div>
                <DataTable headers={['Fecha', 'Anterior', 'Nuevo', '%', 'Índice']} rows={(activeLease.rentHistory || []).map((item: any) => [date(item.changeDate), money(item.oldRent, currency), money(item.newRent, currency), item.percent != null ? `${Number(item.percent).toFixed(2)}%` : '—', item.indexUsed || '—'])} />
              </> : <EmptyState>Sin contrato vigente ni cronograma de aumentos.</EmptyState>}
            </div>
          </section>

          <section id="propietarios" className={`${styles.coloredSection} scroll-mt-28`}>
            <div className={`${styles.coloredHeader} ${styles.headerViolet}`}><div><h2>Propietarios</h2><p>Titularidad, contacto y liquidaciones</p></div><ShieldCheck className="h-5 w-5 text-violet-700" /></div>
            <div className={styles.coloredBody}>
              <div className="space-y-3">{p.owners?.length ? p.owners.map((owner: any) => <Link key={owner.id} href={`/contactos/${owner.contactId}`} className="block rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/40"><div className="flex items-center justify-between gap-4"><div><p className="font-black text-slate-900">{name(owner.contact)}</p><p className="mt-1 text-xs text-slate-500">{owner.contact.cuit || owner.contact.documentNumber || 'Sin identificación'} · {owner.contact.phone || owner.contact.email || 'sin contacto'}</p></div><div className="text-right"><p className="text-lg font-black text-violet-700">{Number(owner.ownershipPercentage).toFixed(2)}%</p>{owner.isPrimary && <span className="text-[9px] font-black uppercase text-violet-500">Principal</span>}</div></div></Link>) : <EmptyState>Sin propietarios relacionados.</EmptyState>}</div>
            </div>
          </section>

          <section id="mantenimiento" className={`${styles.coloredSection} scroll-mt-28`}>
            <div className={`${styles.coloredHeader} ${openMaintenance.length ? styles.headerAmber : styles.headerGreen}`}><div><h2>Mantenimiento</h2><p>Órdenes, proveedores y costo técnico</p></div><Wrench className="h-5 w-5 text-amber-700" /></div>
            <div className={styles.coloredBody}>
              <div className="mb-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Abiertas</p><p className="mt-1 text-xl font-black text-slate-900">{openMaintenance.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Costo histórico</p><p className="mt-1 text-xl font-black text-slate-900">{money(maintenanceCost, currency)}</p></div></div>
              <DataTable headers={['Orden', 'Proveedor', 'Prioridad', 'Estado']} rows={(p.maintenanceRequests || []).slice(0, 10).map((request: any) => [<Link key="r" href={`/mantenimiento/${request.id}`} className="font-bold text-indigo-700">{request.title}</Link>, name(request.provider), <StatusPill key="p" tone={tone(request.priority)}>{request.priority}</StatusPill>, <StatusPill key="s" tone={tone(request.status)}>{request.status}</StatusPill>])} />
            </div>
          </section>

          <section id="documentos" className={`${styles.coloredSection} scroll-mt-28`}>
            <div className={`${styles.coloredHeader} ${styles.headerBlue}`}><div><h2>Documentos y comunicaciones</h2><p>Contrato, archivos y conversaciones relacionadas</p></div><MessageSquare className="h-5 w-5 text-blue-700" /></div>
            <div className={styles.coloredBody}>
              <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 p-3"><div><p className="text-[10px] font-black uppercase text-blue-500">Archivos vinculados</p><p className="text-lg font-black text-blue-950">{(p.documents || []).length + contractDocs.length}</p></div><div><p className="text-[10px] font-black uppercase text-blue-500">Conversaciones</p><p className="text-right text-lg font-black text-blue-950">{(data.communications as any[]).length}</p></div></div>
              <div className="space-y-2">{[...(contractDocs || []), ...(p.documents || [])].slice(0, 8).map((doc: any) => <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-blue-200 hover:bg-blue-50/40"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{doc.fileName}</p><p className="text-[10px] uppercase text-slate-400">{doc.category} · {date(doc.uploadedAt)}</p></div><ExternalLink className="h-4 w-4 shrink-0 text-blue-600" /></a>)}{!(p.documents || []).length && !contractDocs.length && <EmptyState>Sin documentos vinculados.</EmptyState>}</div>
            </div>
          </section>

          <section id="comercial" className={`${styles.coloredSection} scroll-mt-28`}>
            <div className={`${styles.coloredHeader} ${styles.headerGreen}`}><div><h2>Comercial</h2><p>Publicaciones, interesados, visitas y operaciones</p></div><TrendingUp className="h-5 w-5 text-emerald-700" /></div>
            <div className={styles.coloredBody}>
              <div className="mb-4 grid grid-cols-4 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-xl text-slate-900">{activePublications.length}</strong><span className="text-[9px] font-bold uppercase text-slate-400">Publicadas</span></div><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-xl text-slate-900">{p.leadPropertyInterests?.length || 0}</strong><span className="text-[9px] font-bold uppercase text-slate-400">Interesados</span></div><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-xl text-slate-900">{p.calendarEvents?.length || 0}</strong><span className="text-[9px] font-bold uppercase text-slate-400">Eventos</span></div><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-xl text-slate-900">{p.deals?.length || 0}</strong><span className="text-[9px] font-bold uppercase text-slate-400">Operaciones</span></div></div>
              <DataTable headers={['Lead / contacto', 'Estado', 'Agente', 'Actualizado']} rows={(p.leadPropertyInterests || []).slice(0, 8).map((interest: any) => [<div key="l"><p className="font-bold">{interest.lead.title}</p><p className="text-xs text-slate-400">{name(interest.lead.contact)}</p></div>, <StatusPill key="s" tone={tone(interest.lead.status)}>{interest.lead.status}</StatusPill>, interest.lead.agent?.name || '—', date(interest.updatedAt)])} />
            </div>
          </section>
        </div>

        <section id="actividad" className={`${styles.coloredSection} scroll-mt-28`}>
          <div className={`${styles.coloredHeader} ${styles.headerSlate}`}><div><h2>Actividad 360</h2><p>Todo lo que ocurrió sobre esta propiedad, en orden cronológico</p></div><Clock3 className="h-5 w-5 text-slate-600" /></div>
          <div className={styles.coloredBody}>
            <Timeline items={(data.activity as any[]).map((item: any) => ({ id: item.id, title: item.title || item.eventKey, detail: item.description, date: item.createdAt, actor: item.actorName }))} />
          </div>
        </section>
      </div>
    </div>
  );
}
