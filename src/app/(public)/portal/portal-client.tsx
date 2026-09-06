'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Files,
  Home,
  House,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Plus,
  ReceiptText,
  UserRound,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react';
import { createRenterMaintenanceRequestAction, updateRenterPortalProfileAction } from '@/actions/renter-portal';
import { PortalCommunications } from '@/components/portal/portal-communications';
import { formatCurrency, formatDate } from '@/lib/utils';

type PortalTab = 'HOME' | 'ACCOUNT' | 'DOCUMENTS' | 'MAINTENANCE' | 'COMMUNICATIONS' | 'PROFILE';

type NavItem = {
  tab?: PortalTab;
  label: string;
  icon: React.ReactNode;
  more?: boolean;
};

const leaseStatusLabels: Record<string, string> = {
  CURRENT: 'Vigente',
  EXPIRING: 'Por vencer',
  RENEWED: 'Renovado',
};

const debtStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Pago parcial',
  OVERDUE: 'Vencido',
  PAID: 'Pagado',
};

const maintenanceStatusLabels: Record<string, string> = {
  OPEN: 'Recibida',
  TRIAGED: 'En revisión',
  QUOTED: 'Presupuestada',
  APPROVED: 'Aprobada',
  SCHEDULED: 'Programada',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resuelta',
  CANCELED: 'Cancelada',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export function RenterPortalClient({ data }: { data: any }) {
  const router = useRouter();
  const [tab, setTab] = useState<PortalTab>('HOME');
  const [showMore, setShowMore] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const pendingDebts = useMemo(
    () => data.debts.filter((debt: any) => debt.status !== 'PAID' && debt.amount - debt.paidAmount > 0.01),
    [data.debts],
  );
  const overdueDebts = useMemo(
    () => pendingDebts.filter((debt: any) => debt.status === 'OVERDUE' || new Date(debt.dueDate) < today),
    [pendingDebts, today],
  );
  const totalPending = pendingDebts.reduce((sum: number, debt: any) => sum + Math.max(0, debt.amount - debt.paidAmount), 0);
  const overdueTotal = overdueDebts.reduce((sum: number, debt: any) => sum + Math.max(0, debt.amount - debt.paidAmount), 0);
  const openMaintenance = data.maintenanceRequests.filter((request: any) => !['RESOLVED', 'CANCELED'].includes(request.status));
  const unreadCommunications = (data.communications || []).filter((item: any) => !item.readAt).length;
  const activeContracts = data.propertyLeases.length + data.garageLeases.length;
  const lastPayment = data.payments[0] || null;

  const navItems: NavItem[] = [
    { tab: 'HOME', label: 'Inicio', icon: <Home /> },
    { tab: 'ACCOUNT', label: 'Cuenta', icon: <WalletCards /> },
    { tab: 'MAINTENANCE', label: 'Arreglos', icon: <Wrench /> },
    { tab: 'COMMUNICATIONS', label: 'Mensajes', icon: <MessageSquare /> },
    { label: 'Más', icon: <MoreHorizontal />, more: true },
  ];

  function go(tabValue: PortalTab) {
    setTab(tabValue);
    setShowMore(false);
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function run(task: () => Promise<any>, success: string, after?: () => void) {
    setError('');
    setMessage('');
    startTransition(async () => {
      try {
        await task();
        setMessage(success);
        after?.();
        router.refresh();
      } catch (err: any) {
        setError(err?.message || 'No se pudo completar la operación.');
      }
    });
  }

  function submitMaintenance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () => createRenterMaintenanceRequestAction({
        propertyId: String(form.get('propertyId') || ''),
        category: String(form.get('category') || ''),
        priority: String(form.get('priority') || 'NORMAL') as any,
        title: String(form.get('title') || ''),
        description: String(form.get('description') || ''),
      }),
      'Solicitud enviada correctamente.',
      () => setShowMaintenanceForm(false),
    );
  }

  function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () => updateRenterPortalProfileAction({
        email: String(form.get('email') || '') || null,
        phone: String(form.get('phone') || '') || null,
        address: String(form.get('address') || '') || null,
      }),
      'Tus datos fueron actualizados.',
    );
  }

  return (
    <div className="space-y-6">
      {(error || message) && (
        <div className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      {tab === 'HOME' && (
        <div className="space-y-6">
          <section className="pwa-hero">
            <div className="relative z-10">
              <p className="pwa-eyebrow text-indigo-200">Mi alquiler</p>
              <div className="mt-3 flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <h1 className="text-[26px] font-black leading-tight tracking-[-.035em] text-white">Hola, {data.renter.firstName}</h1>
                  <p className="mt-1.5 text-xs text-slate-300">Todo lo importante de tu alquiler, en un solo lugar.</p>
                </div>
                <div className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${overdueTotal > 0 ? 'bg-orange-300/15 text-orange-200 ring-1 ring-orange-300/25' : 'bg-emerald-300/15 text-emerald-200 ring-1 ring-emerald-300/25'}`}>
                  {overdueTotal > 0 ? 'Revisar cuenta' : 'Al día'}
                </div>
              </div>

              <div className="mt-7 grid grid-cols-[1fr_auto] items-end gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[.15em] text-slate-400">Saldo pendiente</p>
                  <p className="mt-1 font-mono text-[30px] font-black tracking-[-.04em] text-white">{formatCurrency(totalPending)}</p>
                </div>
                <button onClick={() => go('ACCOUNT')} className="inline-flex h-10 items-center gap-1 rounded-xl bg-white/10 px-3 text-[10px] font-bold text-white ring-1 ring-white/15 backdrop-blur hover:bg-white/15">
                  Ver cuenta <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                {overdueTotal > 0 ? (
                  <div className="flex items-center gap-2 text-orange-100">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p className="text-[11px] font-semibold">Tenés {formatCurrency(overdueTotal)} vencidos.</p>
                  </div>
                ) : data.nextDue ? (
                  <div className="flex items-center justify-between gap-3 text-slate-200">
                    <div className="flex min-w-0 items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-indigo-200" />
                      <p className="truncate text-[11px]">Próximo vencimiento: <b>{formatDate(data.nextDue.dueDate)}</b></p>
                    </div>
                    <b className="shrink-0 font-mono text-[11px]">{formatCurrency(data.nextDue.amount)}</b>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="text-[11px] font-semibold">No tenés vencimientos próximos.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="pwa-section-head">
              <div>
                <h2 className="pwa-title">Accesos rápidos</h2>
                <p className="pwa-subtitle">Lo que más vas a usar.</p>
              </div>
            </div>
            <div className="pwa-action-grid">
              <QuickAction icon={<CreditCard />} label="Mi cuenta" onClick={() => go('ACCOUNT')} />
              <QuickAction icon={<Files />} label="Documentos" onClick={() => go('DOCUMENTS')} />
              <QuickAction icon={<Wrench />} label="Pedir arreglo" onClick={() => { setTab('MAINTENANCE'); setShowMaintenanceForm(true); }} />
              <QuickAction icon={<MessageSquare />} label="Mensajes" badge={unreadCommunications} onClick={() => go('COMMUNICATIONS')} />
            </div>
          </section>

          <section>
            <div className="pwa-section-head">
              <div>
                <h2 className="pwa-title">Tu alquiler</h2>
                <p className="pwa-subtitle">{activeContracts === 1 ? '1 contrato vigente' : `${activeContracts} contratos vigentes`}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {data.propertyLeases.map((lease: any) => (
                <article key={lease.id} className="pwa-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><House className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{lease.property.code}</p>
                        <h3 className="mt-1 text-sm font-black leading-snug text-slate-900">{lease.property.address}</h3>
                      </div>
                    </div>
                    <Badge text={leaseStatusLabels[lease.status] || lease.status} tone="success" />
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5">
                    <Info label="Alquiler" value={`${formatCurrency(lease.currentRent)}/mes`} />
                    <Info label="Hasta" value={formatDate(lease.endDate)} />
                  </div>
                  {lease.nextAdjustmentDate && (
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
                      <Clock3 className="h-3.5 w-3.5 text-indigo-500" /> Próximo ajuste {formatDate(lease.nextAdjustmentDate)}
                    </div>
                  )}
                </article>
              ))}

              {data.garageLeases.map((lease: any) => (
                <article key={lease.id} className="pwa-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><CarFront className="h-5 w-5" /></div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Cochera</p>
                        <h3 className="mt-1 text-sm font-black text-slate-900">Plazas {lease.spaces.map((item: any) => item.space.spaceNumber).join(', ')}</h3>
                      </div>
                    </div>
                    <Badge text={leaseStatusLabels[lease.status] || lease.status} tone="success" />
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5">
                    <Info label="Alquiler" value={`${formatCurrency(lease.totalRent)}/mes`} />
                    <Info label="Hasta" value={formatDate(lease.endDate)} />
                  </div>
                </article>
              ))}

              {!activeContracts && <Empty text="No tenés contratos vigentes." />}
            </div>
          </section>

          {(lastPayment || openMaintenance.length > 0) && (
            <section>
              <div className="pwa-section-head"><h2 className="pwa-title">Actividad reciente</h2></div>
              <div className="pwa-card px-5">
                {lastPayment && (
                  <div className="pwa-list-row">
                    <div className="flex gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ReceiptText className="h-4 w-4" /></div>
                      <div><p className="text-xs font-bold text-slate-800">Pago registrado</p><p className="mt-1 text-[10px] text-slate-500">{lastPayment.debt.description} · {formatDate(lastPayment.paidAt)}</p></div>
                    </div>
                    <b className="font-mono text-xs text-emerald-700">{formatCurrency(lastPayment.amount)}</b>
                  </div>
                )}
                {openMaintenance[0] && (
                  <div className="pwa-list-row">
                    <div className="flex gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><Wrench className="h-4 w-4" /></div>
                      <div><p className="text-xs font-bold text-slate-800">{openMaintenance[0].title}</p><p className="mt-1 text-[10px] text-slate-500">{maintenanceStatusLabels[openMaintenance[0].status] || openMaintenance[0].status}</p></div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'ACCOUNT' && (
        <div className="space-y-5">
          <PageHeading title="Mi cuenta" subtitle="Vencimientos, pagos y comprobantes de tu alquiler." />

          <section className={`pwa-card p-5 ${overdueTotal > 0 ? 'border-orange-200' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="pwa-eyebrow text-slate-400">Saldo pendiente</p>
                <p className="mt-2 font-mono text-3xl font-black tracking-[-.04em] text-slate-950">{formatCurrency(totalPending)}</p>
              </div>
              <div className={`grid h-11 w-11 place-items-center rounded-2xl ${overdueTotal > 0 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {overdueTotal > 0 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
            </div>
            <p className={`mt-3 text-[11px] font-semibold ${overdueTotal > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
              {overdueTotal > 0 ? `${formatCurrency(overdueTotal)} corresponden a vencimientos atrasados.` : 'Tu cuenta no tiene deuda vencida.'}
            </p>
          </section>

          <section className="pwa-card px-5 py-4">
            <div className="pwa-section-head mb-1">
              <div><h2 className="pwa-title">Pendientes</h2><p className="pwa-subtitle">Cuotas y conceptos todavía abiertos.</p></div>
              <span className="text-[10px] font-bold text-slate-400">{pendingDebts.length}</span>
            </div>
            {pendingDebts.length ? pendingDebts.map((debt: any) => {
              const balance = Math.max(0, debt.amount - debt.paidAmount);
              const overdue = debt.status === 'OVERDUE' || new Date(debt.dueDate) < today;
              return (
                <div key={debt.id} className="pwa-list-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-slate-800">{debt.description}</p>
                      <Badge text={overdue ? 'Vencido' : debtStatusLabels[debt.status] || debt.status} tone={overdue ? 'warning' : 'info'} />
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-500">Vence {formatDate(debt.dueDate)}</p>
                  </div>
                  <div className="text-right"><b className="font-mono text-xs text-slate-950">{formatCurrency(balance)}</b>{debt.paidAmount > 0 && <p className="mt-1 text-[9px] text-slate-400">Pagado {formatCurrency(debt.paidAmount)}</p>}</div>
                </div>
              );
            }) : <Empty text="No tenés saldos pendientes." />}
          </section>

          <section className="pwa-card px-5 py-4">
            <div className="pwa-section-head mb-1">
              <div><h2 className="pwa-title">Pagos y recibos</h2><p className="pwa-subtitle">Tus últimos pagos registrados.</p></div>
            </div>
            {data.payments.length ? data.payments.map((payment: any) => (
              <div key={payment.id} className="pwa-list-row">
                <div className="flex min-w-0 gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ReceiptText className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">{payment.debt.description}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{formatDate(payment.paidAt)} · {payment.method}</p>
                    {payment.receiptNumber && <p className="mt-1 text-[9px] font-bold text-slate-400">Recibo {payment.receiptNumber}</p>}
                  </div>
                </div>
                <b className="font-mono text-xs text-emerald-700">{formatCurrency(payment.amount)}</b>
              </div>
            )) : <Empty text="Todavía no hay pagos registrados." />}
          </section>
        </div>
      )}

      {tab === 'DOCUMENTS' && (
        <div className="space-y-5">
          <PageHeading title="Documentos" subtitle="Contratos, recibos y archivos compartidos con vos." />
          <section className="pwa-card px-5 py-3">
            {data.documents.length ? data.documents.map((document: any) => (
              <div key={document.id} className="pwa-list-row items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><FileText className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">{document.fileName}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{document.category} · {formatDate(document.uploadedAt)}</p>
                  </div>
                </div>
                <a href={document.fileUrl} target="_blank" rel="noreferrer" className="pwa-button pwa-button--secondary !h-9 !min-h-9 !px-3">
                  <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Abrir</span>
                </a>
              </div>
            )) : <Empty text="No hay documentos compartidos todavía." />}
          </section>
        </div>
      )}

      {tab === 'MAINTENANCE' && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <PageHeading title="Mantenimiento" subtitle="Reportá un problema y seguí cada actualización." />
            <button onClick={() => setShowMaintenanceForm(true)} className="pwa-button shrink-0"><Plus className="h-4 w-4" /> Nueva</button>
          </div>

          <section className="grid gap-3 md:grid-cols-2">
            {data.maintenanceRequests.length ? data.maintenanceRequests.map((request: any) => (
              <article key={request.id} className="pwa-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge text={maintenanceStatusLabels[request.status] || request.status} tone={request.status === 'RESOLVED' ? 'success' : request.status === 'CANCELED' ? 'neutral' : 'info'} />
                      <Badge text={priorityLabels[request.priority] || request.priority} tone={request.priority === 'URGENT' ? 'danger' : request.priority === 'HIGH' ? 'warning' : 'neutral'} />
                    </div>
                    <h3 className="mt-3 text-sm font-black text-slate-900">{request.title}</h3>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500"><MapPin className="h-3 w-3" /> {request.property.code} · {request.property.address}</div>
                  </div>
                  <span className="shrink-0 text-[9px] text-slate-400">{formatDate(request.createdAt)}</span>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-600">{request.description}</p>
                {request.events?.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Última actualización</p>
                    <p className="mt-1.5 text-[10px] leading-4 text-slate-500">{request.events[0].note || maintenanceStatusLabels[request.events[0].toStatus] || request.events[0].toStatus || 'Actualización registrada'}</p>
                  </div>
                )}
              </article>
            )) : <Empty text="No tenés solicitudes de mantenimiento." />}
          </section>
        </div>
      )}

      {tab === 'COMMUNICATIONS' && (
        <div className="space-y-3">
          <PageHeading title="Mensajes" subtitle="Avisos y comunicaciones de la inmobiliaria." />
          <PortalCommunications messages={data.communications || []} audience="RENTER" />
        </div>
      )}

      {tab === 'PROFILE' && (
        <div className="space-y-5">
          <PageHeading title="Mis datos" subtitle="Mantené actualizada tu información de contacto." />
          <section className="pwa-card overflow-hidden">
            <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/70 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-lg font-black text-indigo-700">{data.renter.firstName?.slice(0, 1)}{data.renter.lastName?.slice(0, 1)}</div>
              <div><h2 className="text-sm font-black text-slate-900">{data.renter.firstName} {data.renter.lastName}</h2><p className="mt-1 text-[10px] text-slate-500">DNI {data.renter.dni}</p></div>
            </div>
            <form onSubmit={submitProfile} className="grid gap-4 p-5 md:grid-cols-2">
              <Field name="email" label="Correo electrónico" type="email" defaultValue={data.renter.email || ''} icon={<Mail />} />
              <Field name="phone" label="Teléfono" defaultValue={data.renter.phone || ''} icon={<CreditCard className="hidden" />} />
              <Field name="address" label="Domicilio" defaultValue={data.renter.address || ''} className="md:col-span-2" icon={<MapPin />} />
              <div className="md:col-span-2 flex justify-end"><button disabled={isPending} className="pwa-button">{isPending ? 'Guardando...' : 'Guardar cambios'}</button></div>
            </form>
          </section>
        </div>
      )}

      <nav className="pwa-bottom-nav" aria-label="Navegación principal">
        {navItems.map((item) => {
          const active = item.more ? showMore || ['DOCUMENTS', 'PROFILE'].includes(tab) : item.tab === tab;
          return (
            <button
              key={item.label}
              type="button"
              className={`pwa-nav-item ${active ? 'is-active' : ''}`}
              onClick={() => item.more ? setShowMore(true) : item.tab && go(item.tab)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.tab === 'COMMUNICATIONS' && unreadCommunications > 0 && <span className="pwa-nav-dot">{unreadCommunications > 9 ? '9+' : unreadCommunications}</span>}
            </button>
          );
        })}
      </nav>

      {showMore && (
        <div className="pwa-sheet-backdrop" onClick={() => setShowMore(false)}>
          <div className="pwa-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="pwa-sheet__grabber" />
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="pwa-title">Más opciones</h2><p className="pwa-subtitle">Documentos y datos personales.</p></div>
              <button onClick={() => setShowMore(false)} className="pwa-logout"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => go('DOCUMENTS')} className="pwa-action !min-h-28"><span className="pwa-action__icon"><Files className="h-4 w-4" /></span><span>Documentos</span></button>
              <button onClick={() => go('PROFILE')} className="pwa-action !min-h-28"><span className="pwa-action__icon"><UserRound className="h-4 w-4" /></span><span>Mis datos</span></button>
            </div>
          </div>
        </div>
      )}

      {showMaintenanceForm && (
        <div className="pwa-sheet-backdrop" onClick={() => !isPending && setShowMaintenanceForm(false)}>
          <div className="pwa-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="pwa-sheet__grabber" />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><h2 className="pwa-title">Nueva solicitud</h2><p className="pwa-subtitle">Contanos qué pasó. La inmobiliaria recibirá el reporte.</p></div>
              <button type="button" disabled={isPending} onClick={() => setShowMaintenanceForm(false)} className="pwa-logout"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submitMaintenance} className="grid gap-4 md:grid-cols-2">
              <Select name="propertyId" label="Propiedad *" options={data.propertyLeases.map((lease: any) => [lease.property.id, `${lease.property.code} · ${lease.property.address}`])} />
              <Select name="priority" label="Prioridad" options={[["LOW", "Baja"], ["NORMAL", "Normal"], ["HIGH", "Alta"], ["URGENT", "Urgente"]]} />
              <Field name="category" label="Categoría *" placeholder="Ej. Plomería" />
              <Field name="title" label="Título *" placeholder="Describilo en pocas palabras" />
              <TextArea name="description" label="Detalle *" className="md:col-span-2" />
              <div className="md:col-span-2 flex gap-2 pt-1">
                <button type="button" onClick={() => setShowMaintenanceForm(false)} className="pwa-button pwa-button--secondary flex-1">Cancelar</button>
                <button disabled={isPending || !data.propertyLeases.length} className="pwa-button flex-1">{isPending ? 'Enviando...' : 'Enviar solicitud'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><p className="pwa-eyebrow text-indigo-500">Mi alquiler</p><h1 className="mt-2 text-[23px] font-black tracking-[-.035em] text-slate-950">{title}</h1><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div>;
}

function QuickAction({ icon, label, badge = 0, onClick }: { icon: React.ReactNode; label: string; badge?: number; onClick: () => void }) {
  return <button onClick={onClick} className="pwa-action"><span className="relative pwa-action__icon">{icon}{badge > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[7px] font-black text-white">{badge > 9 ? '9+' : badge}</span>}</span><span>{label}</span></button>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-[11px] font-bold text-slate-700">{value}</p></div>;
}

function Badge({ text, tone = 'neutral' }: { text: string; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  return <span className={`pwa-badge pwa-badge--${tone}`}>{text}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty-state col-span-full">{text}</div>;
}

function Field({ name, label, type = 'text', defaultValue = '', className = '', placeholder = '', icon }: { name: string; label: string; type?: string; defaultValue?: string; className?: string; placeholder?: string; icon?: React.ReactNode }) {
  return <label className={`pwa-field ${className}`}><span>{label}</span><div className="relative">{icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}<input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className={`pwa-input ${icon ? '!pl-10' : ''}`} /></div></label>;
}

function TextArea({ name, label, className = '' }: { name: string; label: string; className?: string }) {
  return <label className={`pwa-field ${className}`}><span>{label}</span><textarea name={name} rows={5} className="pwa-input !min-h-28 resize-none" placeholder="Contanos qué problema encontraste y desde cuándo ocurre." /></label>;
}

function Select({ name, label, options }: { name: string; label: string; options: any[] }) {
  return <label className="pwa-field"><span>{label}</span><select name={name} className="pwa-input">{options.map((option: any) => <option key={option[0]} value={option[0]}>{option[1]}</option>)}</select></label>;
}
