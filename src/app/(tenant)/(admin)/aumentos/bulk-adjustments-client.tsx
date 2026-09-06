'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { Calculator, CheckCircle2, Settings2, Sparkles, TriangleAlert } from 'lucide-react';
import { applyRentAdjustmentBatchAction, previewRentAdjustmentBatchAction } from '@/actions/rent-adjustments';
import { formatCurrency, formatDate } from '@/lib/utils';

type GroupItem = {
  leaseId: string;
  propertyCode: string;
  renterName: string;
  currentRent: number;
  dueDate: string;
  adjustmentMethod: string;
  autoAdjustmentEnabled: boolean;
};

type PreviewRow = Awaited<ReturnType<typeof previewRentAdjustmentBatchAction>>[number];

export function BulkAdjustmentsClient({
  items,
  groupLabel,
  globalAutoEnabled,
}: {
  items: GroupItem[];
  groupLabel: string;
  globalAutoEnabled: boolean;
}) {
  const [manualPercent, setManualPercent] = useState(15);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const leaseKey = items.map((item) => item.leaseId).join('|');

  const ready = useMemo(() => preview.filter((row) => row.canApply), [preview]);
  const skipped = useMemo(() => preview.filter((row) => !row.canApply), [preview]);
  const automaticCount = items.filter((item) => item.autoAdjustmentEnabled).length;

  function simulate() {
    setError('');
    setMessage('');
    setPreview([]);
    startTransition(async () => {
      try {
        const rows = await previewRentAdjustmentBatchAction(items.map((item) => item.leaseId), manualPercent);
        setPreview(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo simular el grupo.');
      }
    });
  }

  function applyAll() {
    if (!ready.length) return;
    if (!confirm(`¿Aplicar ${ready.length} aumento/s del grupo ${groupLabel}? Esta acción actualiza alquileres y registra el historial.`)) return;
    setError('');
    setMessage('');
    startTransition(async () => {
      try {
        const result = await applyRentAdjustmentBatchAction(items.map((item) => item.leaseId), manualPercent);
        setMessage(`Listo: ${result.appliedCount} aumento/s aplicado/s${result.skippedCount ? ` y ${result.skippedCount} omitido/s` : ''}.`);
        setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo aplicar el grupo.');
      }
    });
  }

  if (!items.length) return null;

  return (
    <section key={leaseKey} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h3 className="font-black text-slate-900">Acciones rápidas del grupo</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Simulá y aplicá juntos los aumentos que ya correspondan. ICL usa la serie oficial BCRA; porcentaje fijo usa la regla del contrato.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-[10px] font-black ${globalAutoEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
            Automático global: {globalAutoEnabled ? 'ACTIVO' : 'INACTIVO'}
          </span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black text-indigo-700">
            {automaticCount}/{items.length} contratos automáticos
          </span>
          <Link href="/ajustes#aumentos-automaticos" className="btn-secondary">
            <Settings2 className="h-3.5 w-3.5" /> Configurar
          </Link>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <label className="form-label">Porcentaje para reglas manuales</label>
            <input
              type="number"
              min="0.01"
              max="1000"
              step="0.01"
              value={manualPercent}
              onChange={(event) => setManualPercent(Number(event.target.value))}
              className="form-input"
            />
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              Solo se usa en contratos MANUAL, IPC u OTRO. ICL y porcentaje fijo ignoran este valor.
            </p>
          </div>
          <button type="button" onClick={simulate} disabled={isPending} className="btn-primary w-full justify-center">
            <Calculator className="h-4 w-4" /> {isPending ? 'Calculando...' : `Simular ${items.length} contrato/s`}
          </button>
          {preview.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <strong className="block text-xl text-emerald-700">{ready.length}</strong>
                <span className="text-[9px] font-bold uppercase text-emerald-700">Listos</span>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center">
                <strong className="block text-xl text-amber-700">{skipped.length}</strong>
                <span className="text-[9px] font-bold uppercase text-amber-700">Omitidos</span>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0">
          {error && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
          {message && <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</div>}
          {!preview.length ? (
            <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              Simulá el grupo antes de aplicar cambios.
            </div>
          ) : (
            <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {preview.map((row) => (
                <div key={row.leaseId} className="grid gap-2 p-3 text-xs md:grid-cols-[1fr_100px_120px_120px] md:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900">{row.propertyCode}</strong>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">{row.adjustmentMethod}</span>
                    </div>
                    <p className="text-slate-500">{row.renterName} · {row.dueDate ? formatDate(new Date(row.dueDate)) : '—'}</p>
                    {!row.canApply && <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-700"><TriangleAlert className="h-3 w-3" />{row.reason}</p>}
                  </div>
                  <div className="md:text-right">
                    <span className="text-[9px] uppercase text-slate-400">Actual</span>
                    <p className="font-semibold">{formatCurrency(row.oldRent)}</p>
                  </div>
                  <div className="md:text-right">
                    <span className="text-[9px] uppercase text-slate-400">Nuevo</span>
                    <p className={row.canApply ? 'font-black text-emerald-700' : 'text-slate-400'}>{row.newRent ? formatCurrency(row.newRent) : '—'}</p>
                  </div>
                  <div className="md:text-right">
                    <span className="text-[9px] uppercase text-slate-400">Variación</span>
                    <p className="font-semibold">{row.percent != null ? `${row.percent.toFixed(2)}%` : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-500">Solo se modifican los {ready.length} contratos marcados como listos. Los demás quedan sin cambios.</p>
          <button type="button" onClick={applyAll} disabled={isPending || ready.length === 0} className="btn-primary">
            <CheckCircle2 className="h-4 w-4" /> Aplicar {ready.length} aumento/s
          </button>
        </div>
      )}
    </section>
  );
}
