'use client';

import { useState, useTransition } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  X,
  FileText,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { recordPaymentAction, getReceiptDetailsAction } from '@/actions/debts-payments';

interface DebtItem {
  id: string;
  leaseType: string;
  type: string;
  description: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  dueDate: Date;
  status: string;
  assetLabel: string;
  renter: {
    id: string;
    name: string;
    dni: string;
    phone?: string | null;
    email?: string | null;
  };
  payments: Array<{
    id: string;
    amount: number;
    paidAt: Date;
    method: string;
    reference?: string | null;
    receiptNumber?: string | null;
  }>;
}

export function DebtsClient({ initialDebts }: { initialDebts: DebtItem[] }) {
  const [debts, setDebts] = useState(initialDebts);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isPending, startTransition] = useTransition();

  // Payment Modal
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);

  // Receipt Modal
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const filtered = debts.filter((d) => {
    const matchSearch =
      d.renter.name.toLowerCase().includes(search.toLowerCase()) ||
      d.renter.dni.includes(search) ||
      d.description.toLowerCase().includes(search.toLowerCase()) ||
      d.assetLabel.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleOpenPayModal = (debt: DebtItem) => {
    setSelectedDebt(debt);
    setPayAmount(debt.remaining);
  };

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDebt) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      debtId: selectedDebt.id,
      amount: parseFloat(formData.get('amount') as string),
      method: formData.get('method') as any,
      reference: (formData.get('reference') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    };

    startTransition(async () => {
      const res = await recordPaymentAction(data);
      setSelectedDebt(null);
      // Abrir recibo recién emitido
      const receipt = await getReceiptDetailsAction(res.paymentId);
      setReceiptData(receipt);
      window.location.reload();
    });
  };

  const handleViewReceipt = async (paymentId: string) => {
    startTransition(async () => {
      const receipt = await getReceiptDetailsAction(paymentId);
      setReceiptData(receipt);
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por inquilino, DNI o inmueble..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="OVERDUE">Vencidos</option>
            <option value="PARTIAL">Pagos parciales</option>
            <option value="PAID">Cobrados / Al día</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Mostrando {filtered.length} registros
        </div>
      </div>

      {/* Debts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3">Inquilino</th>
                <th className="px-5 py-3">Inmueble / Concepto</th>
                <th className="px-5 py-3">Vencimiento</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Pagado</th>
                <th className="px-5 py-3">Saldo</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => {
                const isPaid = d.status === 'PAID';
                const isOverdue = d.status === 'OVERDUE';
                const latestPayment = d.payments[0];

                return (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900 block text-sm">
                        {d.renter.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        DNI: {d.renter.dni}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-800 block">
                        {d.description}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate max-w-[200px] block">
                        {d.assetLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-600">
                      {formatDate(d.dueDate)}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-medium text-slate-800">
                      {formatCurrency(d.amount)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-emerald-600 font-semibold">
                      {formatCurrency(d.paidAmount)}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-extrabold text-sm text-slate-900">
                      {formatCurrency(d.remaining)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : isOverdue
                            ? 'bg-rose-100 text-rose-800'
                            : d.status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isPaid
                          ? 'Pagado'
                          : isOverdue
                          ? 'Vencido'
                          : d.status === 'PARTIAL'
                          ? 'Parcial'
                          : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => handleOpenPayModal(d)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs shadow-2xs transition-colors"
                        >
                          Cobrar
                        </button>
                      )}
                      {latestPayment && (
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(latestPayment.id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition-colors inline-flex items-center gap-1"
                          title="Ver Recibo"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Recibo</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cobro / Registrar Pago */}
      {selectedDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Registrar Cobranza</h3>
              <button
                type="button"
                onClick={() => setSelectedDebt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 text-xs">
              <p className="text-slate-500">Inquilino: <span className="font-bold text-slate-800">{selectedDebt.renter.name}</span></p>
              <p className="text-slate-500">Concepto: <span className="font-semibold text-slate-700">{selectedDebt.description}</span></p>
              <p className="text-slate-500">Saldo pendiente: <span className="font-mono font-extrabold text-indigo-600">{formatCurrency(selectedDebt.remaining)}</span></p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monto a Cobrar ($) *
                </label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  max={selectedDebt.remaining}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medio de Pago *
                </label>
                <select
                  name="method"
                  defaultValue="EFECTIVO"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="TARJETA">Tarjeta de Débito/Crédito</option>
                  <option value="MERCADOPAGO">Mercado Pago</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  N° de Comprobante / Referencia
                </label>
                <input
                  name="reference"
                  type="text"
                  placeholder="Ej: Transf. 98412894"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas adicionales
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Comentarios del pago..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDebt(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || payAmount <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {isPending ? 'Procesando...' : 'Confirmar Cobro y Emitir Recibo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recibo Oficial Imprimible */}
      {receiptData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header del Recibo */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">
                  {receiptData.tenant.receiptHeader}
                </h2>
                <p className="text-xs text-slate-500">{receiptData.tenant.name}</p>
                {receiptData.tenant.address && (
                  <p className="text-[11px] text-slate-500">{receiptData.tenant.address}</p>
                )}
                {receiptData.tenant.phone && (
                  <p className="text-[11px] text-slate-500">Tel: {receiptData.tenant.phone}</p>
                )}
              </div>
              <div className="text-right border-l-2 border-slate-900 pl-4">
                <span className="text-lg font-extrabold text-slate-900 block">RECIBO</span>
                <span className="font-mono text-xs font-bold text-slate-700 block">
                  N° {receiptData.receiptNumber}
                </span>
                <span className="text-xs text-slate-500 block">
                  Fecha: {formatDate(receiptData.paymentDate)}
                </span>
              </div>
            </div>

            {/* Cuerpo del Recibo */}
            <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed">
              <div className="flex">
                <span className="font-bold w-24 text-slate-900">Recibí de:</span>
                <span className="font-semibold text-slate-900 flex-1">
                  {receiptData.renter.name} (DNI: {receiptData.renter.dni})
                </span>
              </div>

              <div className="flex">
                <span className="font-bold w-24 text-slate-900">La suma de:</span>
                <span className="font-bold uppercase text-slate-900 flex-1">
                  {receiptData.amountWords}
                </span>
              </div>

              <div className="flex">
                <span className="font-bold w-24 text-slate-900">En concepto de:</span>
                <span className="text-slate-800 flex-1">{receiptData.concept}</span>
              </div>

              <div className="flex">
                <span className="font-bold w-24 text-slate-900">Ubicación:</span>
                <span className="text-slate-800 flex-1">{receiptData.assetAddress}</span>
              </div>

              <div className="flex">
                <span className="font-bold w-24 text-slate-900">Forma de pago:</span>
                <span className="font-medium text-slate-800 flex-1">
                  {receiptData.method} {receiptData.reference ? `(${receiptData.reference})` : ''}
                </span>
              </div>
            </div>

            {/* Importe Total Destacado */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 uppercase">Total Abonado</span>
              <span className="font-mono text-2xl font-black text-slate-900">
                {formatCurrency(receiptData.amount)}
              </span>
            </div>

            {/* Firmas y Footer */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[10px] text-slate-400">
                Emitido electrónicamente por plataforma OnlyMob.
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Recibo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptData(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
