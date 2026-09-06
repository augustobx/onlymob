import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { getQuickRentalsStatusAction } from '@/actions/quick-rentals';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Banknote, CheckCircle2, CreditCard, FileText, Home, TriangleAlert, Warehouse } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function QuickRentalsPage() {
  const rentals = await getQuickRentalsStatusAction();
  const current = rentals.filter((item) => !item.overdue);
  const overdue = rentals.filter((item) => item.overdue);
  const monthlyTotal = rentals.reduce((sum, item) => sum + item.monthlyRent, 0);

  return (
    <div>
      <Header
        title="Alquileres"
        subtitle="Vista rápida de todos los contratos vigentes y su estado de cobranza"
      />

      <main className="app-page">
        <div className="page-container space-y-6">
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500"><Home className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-wider">Alquileres vigentes</span></div>
              <strong className="mt-2 block text-3xl font-black text-slate-950">{rentals.length}</strong>
              <p className="mt-1 text-xs text-slate-500">{formatCurrency(monthlyTotal)} mensuales</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-wider">Al día</span></div>
              <strong className="mt-2 block text-3xl font-black text-emerald-950">{current.length}</strong>
              <p className="mt-1 text-xs font-semibold text-emerald-700">Sin alquiler vencido impago</p>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-orange-700"><TriangleAlert className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-wider">Vencidos</span></div>
              <strong className="mt-2 block text-3xl font-black text-orange-950">{overdue.length}</strong>
              <p className="mt-1 text-xs font-semibold text-orange-700">Requieren cobranza</p>
            </div>
          </section>

          {rentals.length === 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <Home className="mx-auto h-8 w-8 text-slate-300" />
              <h2 className="mt-3 font-black text-slate-900">No hay alquileres vigentes</h2>
              <p className="mt-1 text-sm text-slate-500">Cuando haya contratos activos van a aparecer acá.</p>
            </section>
          ) : (
            <section>
              <div className="mb-3">
                <h2 className="text-sm font-black text-slate-900">Estado de alquileres</h2>
                <p className="text-xs text-slate-500">Verde = al día · Naranja = tiene alquiler vencido impago.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rentals.map((item) => {
                  const overdueCard = item.overdue;
                  const AssetIcon = item.type === 'GARAGE' ? Warehouse : Home;
                  return (
                    <article
                      key={`${item.type}-${item.id}`}
                      className={`rounded-2xl border p-5 shadow-sm ${overdueCard ? 'border-orange-300 bg-orange-50' : 'border-emerald-300 bg-emerald-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${overdueCard ? 'bg-orange-200 text-orange-900' : 'bg-emerald-200 text-emerald-900'}`}>
                            {overdueCard ? <TriangleAlert className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                            {overdueCard ? 'Vencido' : 'Al día'}
                          </div>
                          <h3 className="truncate text-base font-black text-slate-950">{item.renterName}</h3>
                          <p className="mt-0.5 text-[11px] font-mono text-slate-500">DNI {item.renterDni}</p>
                        </div>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${overdueCard ? 'bg-orange-200 text-orange-800' : 'bg-emerald-200 text-emerald-800'}`}>
                          <AssetIcon className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-white/80 bg-white/70 p-3">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{item.assetDetail}</p>
                        <p className="mt-1 text-sm font-bold text-slate-800">{item.assetTitle}</p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Alquiler mensual</span>
                          <p className="mt-1 font-mono text-sm font-black text-slate-950">{formatCurrency(item.monthlyRent)}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Contrato hasta</span>
                          <p className="mt-1 text-sm font-bold text-slate-700">{formatDate(new Date(item.endDate))}</p>
                        </div>
                      </div>

                      {overdueCard ? (
                        <div className="mt-4 rounded-xl bg-orange-200/70 p-3 text-orange-950">
                          <div className="flex items-center gap-2"><Banknote className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-wider">Saldo vencido</span></div>
                          <strong className="mt-1 block text-lg font-black">{formatCurrency(item.overdueBalance)}</strong>
                          {item.oldestOverdueDate && <p className="mt-1 text-[11px] font-semibold text-orange-800">Pendiente desde {formatDate(new Date(item.oldestOverdueDate))}</p>}
                        </div>
                      ) : item.openBalance > 0 ? (
                        <div className="mt-4 rounded-xl bg-emerald-100/80 p-3 text-emerald-900">
                          <p className="text-[10px] font-black uppercase tracking-wider">Saldo abierto no vencido</p>
                          <strong className="mt-1 block text-sm font-black">{formatCurrency(item.openBalance)}</strong>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl bg-emerald-100/80 p-3 text-sm font-bold text-emerald-900">Sin saldo pendiente.</div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={item.contractHref} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
                          <FileText className="h-3.5 w-3.5" /> Contrato
                        </Link>
                        <Link href="/cobranzas" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800">
                          <CreditCard className="h-3.5 w-3.5" /> Cobranzas
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
