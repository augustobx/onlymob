'use client';

import { useState, useTransition } from 'react';
import { CalendarClock, Pencil, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updatePropertyLeaseProfessionalAction } from '@/actions/lease-professional';
import { adjustmentMethodLabel } from '@/lib/lease-labels';

type LeaseEditData = {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  extensionUntil?: string | Date | null;
  currentRent: number;
  deposit: number;
  updatePeriodMonths: number;
  adjustmentMethod?: string | null;
  adjustmentIndex?: string | null;
  nextAdjustmentDate?: string | Date | null;
  guaranteeType?: string | null;
  status: string;
  notes?: string | null;
};

function dateInput(value?: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function money(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(value || 0);
}

export function ContractEditClient({ lease }: { lease: LeaseEditData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState((lease.adjustmentMethod || 'ICL').toUpperCase());
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');

    startTransition(async () => {
      try {
        await updatePropertyLeaseProfessionalAction({
          leaseId: lease.id,
          startDate: String(form.get('startDate') || ''),
          endDate: String(form.get('endDate') || ''),
          extensionUntil: String(form.get('extensionUntil') || '') || null,
          deposit: Number(form.get('deposit') || 0),
          updatePeriodMonths: Number(form.get('updatePeriodMonths') || 4),
          adjustmentMethod: method,
          adjustmentIndex: method === 'ICL'
            ? 'ICL'
            : method === 'MANUAL'
              ? null
              : String(form.get('adjustmentIndex') || '') || null,
          nextAdjustmentDate: String(form.get('nextAdjustmentDate') || '') || null,
          guaranteeType: String(form.get('guaranteeType') || '') || null,
          status: String(form.get('status') || lease.status) as any,
          notes: String(form.get('notes') || '') || null,
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo modificar el contrato.');
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        <Pencil className="h-4 w-4" /> Editar contrato
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.15em] text-indigo-600">Contrato 360</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Modificar contrato</h2>
                <p className="mt-1 text-xs text-slate-500">El alquiler actual se modifica desde “Aplicar aumento” para conservar el historial.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-6 p-6">
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Alquiler vigente</span>
                <strong className="mt-1 block text-2xl font-black text-indigo-950">{money(lease.currentRent)}</strong>
                <p className="mt-1 text-xs text-indigo-700">Los cambios de valor quedan registrados como aumentos, no como edición silenciosa.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Inicio" name="startDate" type="date" defaultValue={dateInput(lease.startDate)} required />
                <Field label="Finalización" name="endDate" type="date" defaultValue={dateInput(lease.endDate)} required />
                <Field label="Prórroga hasta" name="extensionUntil" type="date" defaultValue={dateInput(lease.extensionUntil)} />
                <Field label="Depósito" name="deposit" type="number" step="0.01" min="0" defaultValue={String(lease.deposit || 0)} />
              </div>

              <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><CalendarClock className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-black text-amber-950">Regla de aumento</h3>
                    <p className="text-xs text-amber-800">Elegí cómo se actualizará este contrato.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">Modalidad</span>
                    <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900">
                      <option value="ICL">ICL / BCRA</option>
                      <option value="MANUAL">Manual</option>
                      <option value="FIXED_PERCENT">Porcentaje fijo</option>
                      <option value="IPC">IPC</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">Frecuencia</span>
                    <select name="updatePeriodMonths" defaultValue={String(lease.updatePeriodMonths || 4)} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">
                      <option value="1">Cada mes</option>
                      <option value="2">Cada 2 meses</option>
                      <option value="3">Cada 3 meses</option>
                      <option value="4">Cada 4 meses</option>
                      <option value="6">Cada 6 meses</option>
                      <option value="12">Cada 12 meses</option>
                    </select>
                  </label>

                  <Field label="Próximo aumento" name="nextAdjustmentDate" type="date" defaultValue={dateInput(lease.nextAdjustmentDate)} />
                  {!['ICL', 'MANUAL'].includes(method) && (
                    <Field label="Índice / referencia" name="adjustmentIndex" defaultValue={lease.adjustmentIndex || ''} placeholder="IPC, cláusula, referencia..." />
                  )}
                </div>

                <div className="mt-4 rounded-xl bg-white/80 p-3 text-xs text-amber-900">
                  {method === 'ICL'
                    ? 'ICL / BCRA: al aplicar el aumento, OnlyMob toma el ICL oficial de la fecha base y el último disponible y calcula automáticamente el nuevo alquiler.'
                    : method === 'MANUAL'
                      ? 'Manual: al aplicar el aumento vas a poder ingresar el nuevo alquiler o un porcentaje.'
                      : `${adjustmentMethodLabel(method)}: queda registrada como regla contractual y el aumento se confirma manualmente.`}
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo de garantía" name="guaranteeType" defaultValue={lease.guaranteeType || ''} placeholder="Seguro de caución, propietaria..." />
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-slate-700">Estado</span>
                  <select name="status" defaultValue={lease.status} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">
                    <option value="DRAFT">Borrador</option>
                    <option value="CURRENT">Vigente</option>
                    <option value="EXPIRING">Por vencer</option>
                    <option value="RENEWED">Renovado</option>
                    <option value="TERMINATED">Finalizado</option>
                    <option value="CANCELED">Cancelado</option>
                  </select>
                </label>
              </div>

              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Notas contractuales</span>
                <textarea name="notes" defaultValue={lease.notes || ''} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900" />
              </label>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {isPending ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, name, defaultValue = '', type = 'text', placeholder, required, step, min }: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required} step={step} min={min} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900" />
    </label>
  );
}
