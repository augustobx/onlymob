'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  CalendarClock,
  CircleDollarSign,
  FileText,
  MessageSquare,
  ReceiptText,
  Wrench,
  X,
} from 'lucide-react';
import { recordPaymentAction } from '@/actions/debts-payments';
import { applyPropertyLeaseIncreaseAction, previewPropertyLeaseIncreaseAction } from '@/actions/property-360-operations';
import { adjustmentDisplayLabel, adjustmentMethodLabel } from '@/lib/lease-labels';

interface DebtItem {
  id: string;
  description: string;
  remaining: number;
  dueDate: string;
  status: string;
}

interface LeaseInfo {
  id: string;
  currentRent: number;
  updatePeriodMonths: number;
  adjustmentIndex?: string | null;
  adjustmentMethod?: string | null;
  increasePercent?: number | null;
}

type IncreasePreview = Awaited<ReturnType<typeof previewPropertyLeaseIncreaseAction>>;

function money(value: number, currency: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value || 0);
}

function decimal(value: number | null | undefined) {
  return value == null ? '—' : new Intl.NumberFormat('es-AR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(value);
}

export function Property360Actions({
  propertyId,
  currency,
  lease,
  openDebts,
}: {
  propertyId: string;
  currency: string;
  lease: LeaseInfo | null;
  openDebts: DebtItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [increaseOpen, setIncreaseOpen] = useState(false);
  const [error, setError] = useState('');
  const [increasePreview, setIncreasePreview] = useState<IncreasePreview | null>(null);

  const sortedDebts = useMemo(() => [...openDebts].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()), [openDebts]);
  const [debtId, setDebtId] = useState(sortedDebts[0]?.id || '');
  const selectedDebt = sortedDebts.find((item) => item.id === debtId) || sortedDebts[0] || null;
  const [amount, setAmount] = useState(selectedDebt?.remaining || 0);

  const defaultPercent = lease?.increasePercent && lease.increasePercent > 0 ? lease.increasePercent : 0;
  const [percent, setPercent] = useState(defaultPercent);
  const [manualNewRent, setManualNewRent] = useState(0);
  const [indexUsed, setIndexUsed] = useState(lease ? adjustmentDisplayLabel(lease.adjustmentIndex, lease.adjustmentMethod) : 'Manual');
  const isIcl = lease?.adjustmentMethod === 'ICL';
  const manualPreviewRent = lease
    ? manualNewRent > 0
      ? manualNewRent
      : Math.round(lease.currentRent * (1 + (Number(percent) || 0) / 100) * 100) / 100
    : 0;

  function openPayment() {
    const first = sortedDebts[0];
    if (!first) return;
    setDebtId(first.id);
    setAmount(first.remaining);
    setError('');
    setPaymentOpen(true);
  }

  function changeDebt(nextId: string) {
    setDebtId(nextId);
    const next = sortedDebts.find((item) => item.id === nextId);
    setAmount(next?.remaining || 0);
  }

  function openIncrease() {
    if (!lease) return;
    setError('');
    setIncreasePreview(null);
    setManualNewRent(0);
    setPercent(lease.increasePercent && lease.increasePercent > 0 ? lease.increasePercent : 0);
    setIndexUsed(adjustmentDisplayLabel(lease.adjustmentIndex, lease.adjustmentMethod));
    setIncreaseOpen(true);

    if (lease.adjustmentMethod === 'ICL') {
      startTransition(async () => {
        try {
          setIncreasePreview(await previewPropertyLeaseIncreaseAction(lease.id));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo consultar el ICL oficial.');
        }
      });
    }
  }

  function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDebt) return;
    const form = new FormData(event.currentTarget);
    setError('');
    startTransition(async () => {
      try {
        await recordPaymentAction({
          debtId: selectedDebt.id,
          amount: Number(form.get('amount')),
          method: String(form.get('method') || 'TRANSFERENCIA') as 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MERCADOPAGO' | 'OTRO',
          reference: String(form.get('reference') || '') || undefined,
          notes: `Registrado desde Propiedad 360 ${propertyId}`,
        });
        setPaymentOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo registrar el pago.');
      }
    });
  }

  function submitIncrease(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lease) return;
    setError('');
    startTransition(async () => {
      try {
        await applyPropertyLeaseIncreaseAction({
          leaseId: lease.id,
          manualPercent: percent,
          manualNewRent,
          indexUsed,
        });
        setIncreaseOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo aplicar el aumento.');
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={openPayment} disabled={!sortedDebts.length || isPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45">
          <ReceiptText className="h-4 w-4" />
          {sortedDebts.length ? 'Registrar pago' : 'Al día'}
        </button>

        <button type="button" onClick={openIncrease} disabled={!lease || isPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-45">
          <CalendarClock className="h-4 w-4" /> Aplicar aumento
        </button>

        {lease && <Link href={`/contratos/${lease.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"><FileText className="h-4 w-4" /> Ver contrato</Link>}
        <a href="#cuenta" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"><CircleDollarSign className="h-4 w-4" /> Cuenta corriente</a>
        <Link href="/mantenimiento" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"><Wrench className="h-4 w-4" /> Mantenimiento</Link>
        <Link href="/comunicaciones" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"><MessageSquare className="h-4 w-4" /> Mensaje</Link>
      </div>

      {paymentOpen && selectedDebt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div><p className="text-xs font-extrabold uppercase tracking-[.12em] text-emerald-600">Cobranza</p><h3 className="mt-1 text-xl font-black text-slate-950">Registrar pago</h3></div>
              <button onClick={() => setPaymentOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitPayment} className="space-y-5 p-6">
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Concepto</label>
                <select value={selectedDebt.id} onChange={(e) => changeDebt(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900">
                  {sortedDebts.map((item) => <option key={item.id} value={item.id}>{item.description} · saldo {money(item.remaining, currency)}</option>)}
                </select>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Saldo del concepto</p><p className="mt-1 text-2xl font-black text-emerald-950">{money(selectedDebt.remaining, currency)}</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Monto</label><input name="amount" type="number" step="0.01" min="0.01" max={selectedDebt.remaining} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950" /></div>
                <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Medio</label><select name="method" defaultValue="TRANSFERENCIA" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-900"><option value="TRANSFERENCIA">Transferencia</option><option value="EFECTIVO">Efectivo</option><option value="MERCADOPAGO">MercadoPago</option><option value="TARJETA">Tarjeta</option><option value="OTRO">Otro</option></select></div>
              </div>
              <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Referencia</label><input name="reference" placeholder="N° transferencia / observación" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900" /></div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setPaymentOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button><button disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Banknote className="h-4 w-4" />{isPending ? 'Registrando...' : 'Confirmar pago'}</button></div>
            </form>
          </div>
        </div>
      )}

      {increaseOpen && lease && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.12em] text-amber-600">{adjustmentMethodLabel(lease.adjustmentMethod)}</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Aplicar aumento</h3>
              </div>
              <button onClick={() => setIncreaseOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitIncrease} className="space-y-5 p-6">
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}

              {isIcl ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Alquiler actual</p><p className="mt-1 text-xl font-black text-slate-950">{money(lease.currentRent, currency)}</p></div>
                    <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-700">Nuevo por ICL</p><p className="mt-1 text-xl font-black text-amber-950">{increasePreview?.newRent != null ? money(increasePreview.newRent, currency) : 'Calculando…'}</p></div>
                  </div>
                  {increasePreview?.method === 'ICL' && (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="block text-[10px] font-black uppercase text-indigo-500">ICL base · {increasePreview.baseDate}</span><strong className="mt-1 block text-lg text-indigo-950">{decimal(increasePreview.baseIcl)}</strong></div>
                        <div><span className="block text-[10px] font-black uppercase text-indigo-500">ICL actual · {increasePreview.currentDate}</span><strong className="mt-1 block text-lg text-indigo-950">{decimal(increasePreview.currentIcl)}</strong></div>
                      </div>
                      <p className="mt-3 border-t border-indigo-200 pt-3 text-sm font-bold text-indigo-900">Variación calculada: {Number(increasePreview.percent).toFixed(2)}%</p>
                    </div>
                  )}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">El valor se vuelve a consultar al BCRA al confirmar. No se usa un porcentaje escrito manualmente.</div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Alquiler actual</p><p className="mt-1 text-xl font-black text-slate-950">{money(lease.currentRent, currency)}</p></div>
                    <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-700">Nuevo alquiler</p><p className="mt-1 text-xl font-black text-amber-950">{money(manualPreviewRent, currency)}</p></div>
                  </div>
                  <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Nuevo alquiler</label><input type="number" min={lease.currentRent + 0.01} step="0.01" value={manualNewRent || ''} onChange={(e) => setManualNewRent(Number(e.target.value) || 0)} placeholder="Podés ingresar directamente el nuevo valor" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950" /></div>
                  <div className="text-center text-[10px] font-black uppercase tracking-wider text-slate-400">o calcular por porcentaje</div>
                  <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Porcentaje de aumento</label><div className="relative"><input type="number" min="0" max="1000" step="0.01" value={percent || ''} onChange={(e) => { setPercent(Number(e.target.value) || 0); setManualNewRent(0); }} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm font-bold text-slate-950" /><span className="absolute right-3 top-2.5 text-sm font-bold text-slate-400">%</span></div></div>
                  <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Motivo / referencia</label><input value={indexUsed} onChange={(e) => setIndexUsed(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900" placeholder="Ajuste manual, acuerdo contractual..." /></div>
                </>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">Al confirmar se registra el cambio en el historial y el próximo aumento queda programado automáticamente dentro de <strong>{lease.updatePeriodMonths} meses</strong>.</div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIncreaseOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button><button disabled={isPending || (isIcl ? !increasePreview?.newRent : manualPreviewRent <= lease.currentRent)} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"><CalendarClock className="h-4 w-4" />{isPending ? 'Aplicando...' : isIcl ? 'Aplicar aumento ICL' : 'Aplicar aumento'}</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
