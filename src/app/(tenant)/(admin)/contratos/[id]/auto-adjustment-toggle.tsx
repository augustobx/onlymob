'use client';

import { useState, useTransition } from 'react';
import { Zap } from 'lucide-react';
import { setLeaseAutomaticAdjustmentAction } from '@/actions/rent-adjustments';

export function AutoAdjustmentToggle({
  leaseId,
  enabled,
  adjustmentMethod,
  increasePercent,
}: {
  leaseId: string;
  enabled: boolean;
  adjustmentMethod?: string | null;
  increasePercent: number;
}) {
  const [active, setActive] = useState(enabled);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const method = String(adjustmentMethod || '').toUpperCase();
  const supported = method === 'ICL' || (method === 'FIXED_PERCENT' && increasePercent > 0);
  const reason = method === 'FIXED_PERCENT' && increasePercent <= 0
    ? 'Definí primero el porcentaje fijo del contrato.'
    : !['ICL', 'FIXED_PERCENT'].includes(method)
      ? 'Solo ICL o porcentaje fijo pueden ejecutarse automáticamente.'
      : '';

  function toggle() {
    if (!supported || pending) return;
    const next = !active;
    setError('');
    startTransition(async () => {
      try {
        await setLeaseAutomaticAdjustmentAction(leaseId, next);
        setActive(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cambiar la automatización.');
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={!supported || pending}
        title={!supported ? reason : undefined}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
      >
        <Zap className="h-4 w-4" />
        {pending ? 'Guardando...' : active ? 'Aumento auto: ON' : 'Aumento auto: OFF'}
      </button>
      {!supported && <p className="mt-1 max-w-[220px] text-[9px] leading-tight text-slate-400">{reason}</p>}
      {error && <p className="mt-1 max-w-[220px] text-[9px] font-semibold leading-tight text-rose-600">{error}</p>}
    </div>
  );
}
