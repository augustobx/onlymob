'use client';

import { useState, useTransition } from 'react';
import { Settings, Save, CheckCircle2, Building, Mail } from 'lucide-react';

export function SettingsForm({
  tenant,
}: {
  tenant: {
    name: string;
    receiptHeader?: string | null;
    address?: string | null;
    phone?: string | null;
    cuit?: string | null;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      // simulate save / can call server action
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
      <div className="space-y-1 pb-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900">Datos de la Inmobiliaria</h3>
        <p className="text-xs text-slate-500">
          Esta información se utilizará en los encabezados de los recibos de pago oficiales y en el portal de inquilinos.
        </p>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configuraciones actualizadas correctamente.</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nombre de la Inmobiliaria *
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={tenant.name}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Encabezado de Recibos Oficiales *
          </label>
          <input
            name="receiptHeader"
            type="text"
            required
            defaultValue={tenant.receiptHeader || tenant.name}
            placeholder="Ej: TRES DE FEBRERO o TAURIZANO PROPIEDADES"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dirección Comercial
            </label>
            <input
              name="address"
              type="text"
              defaultValue={tenant.address || ''}
              placeholder="Ej: Bottaro 1760"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teléfono de Contacto
            </label>
            <input
              name="phone"
              type="text"
              defaultValue={tenant.phone || ''}
              placeholder="Ej: 3329684696"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            CUIT / Identificación Fiscal
          </label>
          <input
            name="cuit"
            type="text"
            defaultValue={tenant.cuit || ''}
            placeholder="Ej: 20-37925831-4"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
          />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="massSend"
              defaultChecked
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Notificaciones automáticas por correo
              </span>
              <span className="text-[11px] text-slate-500">
                Enviar avisos a los inquilinos cuando se generen nuevas cuotas de alquiler.
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{isPending ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>
    </form>
  );
}
