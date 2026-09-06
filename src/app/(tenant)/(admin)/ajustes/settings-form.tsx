'use client';

import { useState, useTransition } from 'react';
import { Save, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { saveTenantSettingsAction } from '@/actions/settings';

export function SettingsForm({
  tenant,
  massSend,
  autoRentAdjustments,
}: {
  tenant: {
    name: string;
    receiptHeader?: string | null;
    address?: string | null;
    phone?: string | null;
    cuit?: string | null;
  };
  massSend: boolean;
  autoRentAdjustments: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSuccess(false);
    setError('');

    startTransition(async () => {
      try {
        await saveTenantSettingsAction({
          name: String(formData.get('name') || ''),
          receiptHeader: String(formData.get('receiptHeader') || ''),
          address: String(formData.get('address') || ''),
          phone: String(formData.get('phone') || ''),
          cuit: String(formData.get('cuit') || ''),
          massSend: formData.get('massSend') === 'on',
          autoRentAdjustments: formData.get('autoRentAdjustments') === 'on',
        });
        setSuccess(true);
      } catch (err: any) {
        setError(err?.message || 'No se pudieron guardar las configuraciones.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
      <div className="space-y-1 pb-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900">Datos de la Inmobiliaria</h3>
        <p className="text-xs text-slate-500">Esta información se utiliza en recibos, portales y datos institucionales del tenant.</p>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configuraciones actualizadas correctamente.</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Inmobiliaria *</label>
          <input name="name" type="text" required defaultValue={tenant.name} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Encabezado de Recibos Oficiales *</label>
          <input name="receiptHeader" type="text" required defaultValue={tenant.receiptHeader || tenant.name} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Comercial</label>
            <input name="address" type="text" defaultValue={tenant.address || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono de Contacto</label>
            <input name="phone" type="text" defaultValue={tenant.phone || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">CUIT / Identificación Fiscal</label>
          <input name="cuit" type="text" defaultValue={tenant.cuit || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900" />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="massSend" defaultChecked={massSend} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Notificaciones automáticas</span>
              <span className="text-[11px] text-slate-500">Habilita los avisos automáticos generados por las rutinas del sistema.</span>
            </div>
          </label>
        </div>

        <section id="aumentos-automaticos" className="scroll-mt-28 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-indigo-950">Aumentos automáticos</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">
                Este es el interruptor general. Para que un contrato se actualice solo también debe tener activada su opción individual.
              </p>
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-100 bg-white p-3">
            <input type="checkbox" name="autoRentAdjustments" defaultChecked={autoRentAdjustments} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <div>
              <span className="block text-xs font-black text-slate-900">Aplicar automáticamente al llegar la fecha de aumento</span>
              <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">
                Solo se ejecutan contratos con fórmula determinística: ICL/BCRA o porcentaje fijo previamente configurado. Manual, IPC y otros métodos nunca se aplican solos.
              </span>
            </div>
          </label>
        </section>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
          <Save className="w-4 h-4" />
          <span>{isPending ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>
    </form>
  );
}
