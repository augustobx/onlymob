import { Bell, CheckCheck, CircleAlert, CreditCard, FileClock, HandCoins, Home, Wrench } from 'lucide-react';
import { Header } from '@/components/layout/header';
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/actions/notifications';

export const dynamic = 'force-dynamic';

const EVENT_LABELS: Record<string, string> = {
  LEAD_NEW: 'CRM',
  LEAD_NO_RESPONSE: 'CRM',
  VISIT_REMINDER: 'Agenda',
  LEASE_EXPIRING: 'Contrato',
  ADJUSTMENT_UPCOMING: 'Contrato',
  QUOTA_GENERATED: 'Cobranza',
  DEBT_DUE_SOON: 'Cobranza',
  DEBT_OVERDUE: 'Cobranza',
  PAYMENT_REGISTERED: 'Pago',
  MAINTENANCE_UPDATED: 'Mantenimiento',
  SETTLEMENT_READY: 'Liquidación',
};

function EventIcon({ eventKey }: { eventKey: string }) {
  if (eventKey.startsWith('MAINTENANCE')) return <Wrench className="w-4 h-4" />;
  if (eventKey.startsWith('PAYMENT') || eventKey.includes('DEBT') || eventKey.includes('QUOTA')) return <CreditCard className="w-4 h-4" />;
  if (eventKey.startsWith('LEASE') || eventKey.startsWith('ADJUSTMENT')) return <FileClock className="w-4 h-4" />;
  if (eventKey.startsWith('SETTLEMENT')) return <HandCoins className="w-4 h-4" />;
  if (eventKey.startsWith('VISIT')) return <Home className="w-4 h-4" />;
  return <CircleAlert className="w-4 h-4" />;
}

export default async function NotificationsPage() {
  const { notifications, unreadCount } = await getNotificationsAction(80);

  return (
    <div>
      <Header
        title="Notificaciones"
        subtitle="Alertas operativas y automatizaciones de la inmobiliaria"
      />

      <div className="p-8 max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Centro de actividad</p>
              <p className="text-xs text-slate-500">{unreadCount} notificación/es sin leer</p>
            </div>
          </div>

          {unreadCount > 0 && (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <CheckCheck className="w-4 h-4" /> Marcar todas como leídas
              </button>
            </form>
          )}
        </div>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h2 className="font-bold text-slate-900">Todavía no hay notificaciones</h2>
              <p className="text-xs text-slate-500 mt-1">Los eventos automáticos van a aparecer acá.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const unread = !notification.readAt;
                return (
                  <article key={notification.id} className={`p-4 flex gap-3 ${unread ? 'bg-indigo-50/40' : 'bg-white'}`}>
                    <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${unread ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                      <EventIcon eventKey={notification.eventKey} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-900">{notification.title}</h3>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                              {EVENT_LABELS[notification.eventKey] || 'Sistema'}
                            </span>
                            {unread && <span className="w-2 h-2 rounded-full bg-indigo-500" title="Sin leer" />}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{notification.body}</p>
                          <p className="text-[11px] text-slate-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString('es-AR')}
                          </p>
                        </div>

                        {unread && (
                          <form action={markNotificationReadAction}>
                            <input type="hidden" name="notificationId" value={notification.id} />
                            <button type="submit" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap">
                              Marcar leída
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
