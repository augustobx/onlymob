'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Banknote, CheckCircle2, CreditCard, FileText, Home, Printer, ReceiptText, TriangleAlert, Warehouse, X } from 'lucide-react';
import { getReceiptDetailsAction, recordPaymentAction } from '@/actions/debts-payments';
import { formatCurrency, formatDate } from '@/lib/utils';

type QuickDebt = {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  dueDate: string;
  status: string;
  overdue: boolean;
};

type QuickPayment = {
  id: string;
  amount: number;
  paidAt: string;
  method: string;
  receiptNumber: string | null;
  debtDescription: string;
};

export type QuickRental = {
  id: string;
  type: 'PROPERTY' | 'GARAGE';
  renterName: string;
  renterDni: string;
  assetTitle: string;
  assetDetail: string;
  monthlyRent: number;
  endDate: string;
  contractHref: string;
  propertyHref: string | null;
  overdue: boolean;
  openBalance: number;
  overdueBalance: number;
  oldestOverdueDate: string | null;
  debts: QuickDebt[];
  recentPayments: QuickPayment[];
};

type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MERCADOPAGO' | 'OTRO';

export function RentalsCardsClient({ rentals }: { rentals: QuickRental[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<QuickRental | null>(null);
  const [selectedDebtId, setSelectedDebtId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('EFECTIVO');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedDebt = useMemo(
    () => selected?.debts.find((debt) => debt.id === selectedDebtId) || null,
    [selected, selectedDebtId],
  );

  function openCollections(item: QuickRental) {
    setSelected(item);
    setError('');
    setReference('');
    setNotes('');
    const firstDebt = item.debts[0];
    setSelectedDebtId(firstDebt?.id || '');
    setAmount(firstDebt ? String(firstDebt.remaining) : '');
  }

  function chooseDebt(debtId: string) {
    setSelectedDebtId(debtId);
    const debt = selected?.debts.find((item) => item.id === debtId);
    setAmount(debt ? String(debt.remaining) : '');
    setError('');
  }

  function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDebt) return;

    const numericAmount = Number(amount);
    startTransition(async () => {
      try {
        setError('');
        const result = await recordPaymentAction({
          debtId: selectedDebt.id,
          amount: numericAmount,
          method,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        const details = await getReceiptDetailsAction(result.paymentId);
        setSelected(null);
        setReceipt(details);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo registrar el pago.');
      }
    });
  }

  async function openExistingReceipt(paymentId: string) {
    const popup = window.open('', '_blank', 'width=920,height=720');
    if (popup) popup.document.write('<p style="font-family:Arial;padding:24px">Preparando recibo...</p>');
    try {
      const details = await getReceiptDetailsAction(paymentId);
      if (popup) {
        renderReceiptWindow(popup, details);
      } else {
        setReceipt(details);
      }
    } catch (err) {
      if (popup) popup.close();
      setError(err instanceof Error ? err.message : 'No se pudo abrir el recibo.');
    }
  }

  return (
    <>
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
                {item.propertyHref && (
                  <Link href={item.propertyHref} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50">
                    <Home className="h-3.5 w-3.5" /> Propiedad 360
                  </Link>
                )}
                <button type="button" onClick={() => openCollections(item)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800">
                  <CreditCard className="h-3.5 w-3.5" /> Cobrar / Recibo
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-600">Cobranza rápida</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{selected.renterName}</h2>
                <p className="mt-1 text-xs text-slate-500">{selected.assetTitle}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-6 p-6">
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}

              <section>
                <div className="mb-3 flex items-center gap-2"><Banknote className="h-4 w-4 text-indigo-600" /><h3 className="font-black text-slate-900">Cobrar</h3></div>
                {selected.debts.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Este alquiler no tiene saldo pendiente.</div>
                ) : (
                  <form onSubmit={submitPayment} className="space-y-4 rounded-2xl border border-slate-200 p-4">
                    <label>
                      <span className="form-label">Concepto a cobrar</span>
                      <select value={selectedDebtId} onChange={(event) => chooseDebt(event.target.value)} className="form-input">
                        {selected.debts.map((debt) => (
                          <option key={debt.id} value={debt.id}>{debt.description} · {formatCurrency(debt.remaining)}{debt.overdue ? ' · VENCIDO' : ''}</option>
                        ))}
                      </select>
                    </label>

                    {selectedDebt && (
                      <div className={`rounded-xl p-3 ${selectedDebt.overdue ? 'bg-orange-50 text-orange-950' : 'bg-slate-50 text-slate-800'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span>Vence {formatDate(new Date(selectedDebt.dueDate))}</span>
                          <strong>Saldo {formatCurrency(selectedDebt.remaining)}</strong>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label><span className="form-label">Importe</span><input type="number" min="0.01" step="0.01" max={selectedDebt?.remaining} value={amount} onChange={(event) => setAmount(event.target.value)} className="form-input" required /></label>
                      <label><span className="form-label">Medio de pago</span><select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="form-input"><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="TARJETA">Tarjeta</option><option value="MERCADOPAGO">Mercado Pago</option><option value="OTRO">Otro</option></select></label>
                    </div>
                    <label><span className="form-label">Referencia</span><input value={reference} onChange={(event) => setReference(event.target.value)} className="form-input" placeholder="Transferencia, comprobante, etc." /></label>
                    <label><span className="form-label">Notas</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className="form-input" /></label>
                    <div className="flex justify-end"><button disabled={isPending || !selectedDebt} className="btn-primary"><CreditCard className="h-4 w-4" />{isPending ? 'Registrando...' : 'Registrar pago'}</button></div>
                  </form>
                )}
              </section>

              <section className="border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center gap-2"><ReceiptText className="h-4 w-4 text-indigo-600" /><h3 className="font-black text-slate-900">Recibos</h3></div>
                {selected.recentPayments.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Todavía no hay recibos registrados para este alquiler.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.recentPayments.map((payment) => (
                      <div key={payment.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{payment.receiptNumber || 'Recibo'} · {formatCurrency(payment.amount)}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(new Date(payment.paidAt))} · {payment.debtDescription}</p>
                        </div>
                        <button type="button" onClick={() => openExistingReceipt(payment.id)} className="ui-action-secondary"><Printer className="h-3.5 w-3.5" /> Imprimir recibo</button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-600">Pago registrado</p><h2 className="mt-1 text-xl font-black text-slate-950">Recibo {receipt.receiptNumber}</h2></div>
              <button type="button" onClick={() => setReceipt(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 p-6 text-sm">
              <ReceiptRow label="Inquilino" value={receipt.renter?.name || '—'} />
              <ReceiptRow label="Dirección" value={receipt.assetAddress || '—'} />
              <ReceiptRow label="Concepto" value={receipt.concept || '—'} />
              <ReceiptRow label="Importe" value={formatCurrency(receipt.amount || 0)} />
              <ReceiptRow label="Fecha" value={receipt.paymentDate ? formatDate(new Date(receipt.paymentDate)) : '—'} />
              <ReceiptRow label="Medio" value={receipt.method || '—'} />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
              <button type="button" onClick={() => setReceipt(null)} className="btn-secondary">Cerrar</button>
              <button type="button" onClick={() => printReceipt(receipt)} className="btn-primary"><Printer className="h-4 w-4" /> Imprimir recibo</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><span className="text-slate-500">{label}</span><strong className="text-right text-slate-900">{value}</strong></div>;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function receiptHtml(data: any) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${escapeHtml(data.receiptNumber)}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0}.receipt{border:1px solid #999;border-radius:8px;padding:18px;max-width:760px;margin:auto}.head{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #ddd;padding-bottom:12px;margin-bottom:14px}.title{font-size:19px;font-weight:800}.small{font-size:12px;color:#555}.row{display:flex;justify-content:space-between;gap:20px;padding:7px 0;border-bottom:1px dashed #ddd;font-size:13px}.amount{text-align:center;font-size:25px;font-weight:900;padding:20px 0}.words{font-size:12px;text-align:center;color:#444}.footer{margin-top:18px;font-size:11px;color:#666}</style></head><body><div class="receipt"><div class="head"><div><div class="title">${escapeHtml(data.tenant?.receiptHeader || data.tenant?.name || 'Recibo')}</div><div class="small">${escapeHtml(data.tenant?.address || '')}</div><div class="small">${escapeHtml(data.tenant?.cuit || '')}</div></div><div style="text-align:right"><strong>Recibo N° ${escapeHtml(data.receiptNumber)}</strong><div class="small">${escapeHtml(data.paymentDate ? new Date(data.paymentDate).toLocaleDateString('es-AR') : '')}</div></div></div><div class="row"><span>Inquilino</span><strong>${escapeHtml(data.renter?.name)}</strong></div><div class="row"><span>DNI</span><strong>${escapeHtml(data.renter?.dni)}</strong></div><div class="row"><span>Dirección</span><strong>${escapeHtml(data.assetAddress)}</strong></div><div class="row"><span>Concepto</span><strong>${escapeHtml(data.concept)}</strong></div><div class="row"><span>Medio de pago</span><strong>${escapeHtml(data.method)}</strong></div>${data.reference ? `<div class="row"><span>Referencia</span><strong>${escapeHtml(data.reference)}</strong></div>` : ''}<div class="amount">${escapeHtml(new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(Number(data.amount||0)))}</div><div class="words">Son: ${escapeHtml(data.amountWords || '')}</div><div class="footer">${escapeHtml(data.notes || '')}</div></div><script>window.onload=()=>{window.print();}</script></body></html>`;
}

function renderReceiptWindow(popup: Window, data: any) {
  popup.document.open();
  popup.document.write(receiptHtml(data));
  popup.document.close();
}

function printReceipt(data: any) {
  const popup = window.open('', '_blank', 'width=920,height=720');
  if (!popup) return;
  renderReceiptWindow(popup, data);
}
