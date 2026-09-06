import { Header } from '@/components/layout/header';
import { getQuickRentalsStatusAction } from '@/actions/quick-rentals';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, Home, TriangleAlert } from 'lucide-react';
import { RentalsCardsClient } from './rentals-cards-client';

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
                <p className="text-xs text-slate-500">Verde = al día · Naranja = tiene alquiler vencido impago. Cobrá e imprimí recibos sin salir de esta vista.</p>
              </div>
              <RentalsCardsClient rentals={rentals} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
