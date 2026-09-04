import { redirect } from 'next/navigation';
import { getRenterSession } from '@/lib/auth';
import { platformPrisma } from '@/lib/prisma-core';
import { logoutRenterAction } from '@/actions/auth-actions';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Home,
  Warehouse,
  FileText,
  CreditCard,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RenterDashboardPage() {
  const session = await getRenterSession();
  if (!session) {
    redirect('/portal/login');
  }

  const [renter, debts, payments] = await Promise.all([
    platformPrisma.propertyRenter.findUnique({
      where: { id: session.renterId },
      include: {
        tenant: true,
        propertyLeases: {
          where: { status: 'CURRENT' },
          include: { property: true },
        },
        garageLeases: {
          where: { status: 'CURRENT' },
          include: {
            spaces: {
              include: { space: { include: { garage: true } } },
            },
          },
        },
      },
    }),
    platformPrisma.debt.findMany({
      where: {
        renterId: session.renterId,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      orderBy: { dueDate: 'asc' },
    }),
    platformPrisma.payment.findMany({
      where: { debt: { renterId: session.renterId } },
      include: { debt: true },
      orderBy: { paidAt: 'desc' },
      take: 10,
    }),
  ]);

  if (!renter) redirect('/portal/login');

  const totalPending = debts.reduce(
    (sum, d) => sum + (Number(d.amount) - Number(d.paidAmount)),
    0
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Mobile-friendly PWA Header */}
      <header className="bg-indigo-600 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-700/80 rounded-xl">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">{renter.tenant.name}</h1>
              <p className="text-[11px] text-indigo-200">Portal Inquilino</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-semibold">{session.name}</span>
            <form action={logoutRenterAction}>
              <button
                type="submit"
                title="Cerrar Sesión"
                className="p-2 rounded-lg bg-indigo-700/50 hover:bg-indigo-800 text-indigo-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Welcome Greeting & Balance Alert */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Hola, {renter.firstName} 👋
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              DNI: <span className="font-mono font-semibold text-slate-700">{renter.dni}</span>
            </p>
          </div>

          <div className="w-full sm:w-auto p-4 bg-slate-50 rounded-xl border border-slate-100 sm:text-right">
            <span className="text-xs font-semibold text-slate-500 block">Total a Pagar</span>
            <span
              className={`text-2xl font-black font-mono block ${
                totalPending > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(totalPending)}
            </span>
          </div>
        </div>

        {/* Cuotas Pendientes / Por Vencer */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>Cuotas Pendientes de Pago</span>
          </h3>

          {debts.length === 0 ? (
            <div className="py-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-100 p-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-900">¡Estás al día con tus pagos!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                No tenés cuotas ni alquileres pendientes en este momento.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {debts.map((d) => {
                const balance = Number(d.amount) - Number(d.paidAmount);
                const isOverdue = new Date(d.dueDate) < new Date();

                return (
                  <div
                    key={d.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{d.description}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isOverdue ? 'Vencido' : 'Por Vencer'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Vence el {formatDate(d.dueDate)}</span>
                      </p>
                    </div>

                    <div className="flex items-baseline justify-between sm:justify-end gap-3 font-mono">
                      <span className="text-xs text-slate-400">Total {formatCurrency(d.amount)}</span>
                      <span className="text-base font-extrabold text-slate-900">
                        Saldo: {formatCurrency(balance)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mis Contratos Vigentes */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Mis Contratos Vigentes</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contratos de Inmuebles */}
            {renter.propertyLeases.map((l) => (
              <div
                key={l.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{l.property.code}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                    Inmueble
                  </span>
                </div>
                <p className="text-slate-600">{l.property.address}</p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between font-mono">
                  <span className="text-slate-500">Alquiler:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatCurrency(l.currentRent)}/mes
                  </span>
                </div>
                <div className="text-[11px] text-indigo-600 font-medium">
                  Ajuste cada {l.updatePeriodMonths} meses (ICL)
                </div>
              </div>
            ))}

            {/* Contratos de Cocheras */}
            {renter.garageLeases.map((gl) => (
              <div
                key={gl.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">Cochera</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold text-[10px]">
                    {gl.spaces.length} plaza/s
                  </span>
                </div>
                <p className="text-slate-600">
                  Plazas N° {gl.spaces.map((s) => s.space.spaceNumber).join(', ')}
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between font-mono">
                  <span className="text-slate-500">Total Cochera:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatCurrency(gl.totalRent)}/mes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historial Reciente de Pagos */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Historial de Pagos</h3>
          {payments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No registrás pagos recientes en el sistema.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {payments.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      {p.debt.description}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(p.paidAt)} • {p.method}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-600 block">
                      {formatCurrency(p.amount)}
                    </span>
                    {p.receiptNumber && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Recibo #{p.receiptNumber}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
