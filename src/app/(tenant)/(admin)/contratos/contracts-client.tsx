'use client';

import { useState, useTransition } from 'react';
import {
  FileText,
  Plus,
  TrendingUp,
  Calendar,
  Warehouse,
  Home,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  createPropertyLeaseAction,
  createGarageLeaseAction,
  terminateLeaseAction,
  previewIncreaseAction,
  applyIncreaseAction,
  generateMonthlyQuotasAction,
} from '@/actions/leases';

interface PropertyLeaseItem {
  id: string;
  propertyId: string;
  propertyCode: string;
  propertyAddress: string;
  renterId: string;
  renterName: string;
  startDate: Date;
  endDate: Date;
  currentRent: number;
  deposit: number;
  increasePercent: number;
  updatePeriodMonths: number;
  status: string;
  pendingDebtTotal: number;
}

interface GarageLeaseItem {
  id: string;
  renterId: string;
  renterName: string;
  startDate: Date;
  endDate: Date;
  totalRent: number;
  deposit: number;
  increasePercent: number;
  status: string;
  spacesCount: number;
  spacesDescription: string;
  pendingDebtTotal: number;
}

interface PropertyOption {
  id: string;
  code: string;
  address: string;
  baseRent: number | null;
}

interface RenterOption {
  id: string;
  fullName: string;
  dni: string;
}

interface SpaceOption {
  id: string;
  spaceNumber: string;
  garageName: string;
}

export function ContractsClient({
  propertyLeases,
  garageLeases,
  properties,
  renters,
  availableSpaces,
  currentIclValue,
}: {
  propertyLeases: PropertyLeaseItem[];
  garageLeases: GarageLeaseItem[];
  properties: PropertyOption[];
  renters: RenterOption[];
  availableSpaces: SpaceOption[];
  currentIclValue: number;
}) {
  const [activeTab, setActiveTab] = useState<'PROPERTIES' | 'GARAGES'>('PROPERTIES');
  const [isPending, startTransition] = useTransition();

  // Modals
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isIncreaseOpen, setIsIncreaseOpen] = useState(false);
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);

  // Increase Simulator State
  const [selectedPeriod, setSelectedPeriod] = useState<number>(4);
  const [increasePercent, setIncreasePercent] = useState<number>(15.5);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Quota Modal State
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [quotaPeriod, setQuotaPeriod] = useState(currentMonth);
  const [quotaDueDay, setQuotaDueDay] = useState(10);
  const [quotaMessage, setQuotaMessage] = useState('');

  // Simular aumento
  const handleSimulateIncrease = async () => {
    startTransition(async () => {
      const rows = await previewIncreaseAction(selectedPeriod, increasePercent);
      setPreviewRows(rows);
    });
  };

  const handleApplyIncrease = async () => {
    if (!confirm(`¿Confirmás aplicar un aumento del ${increasePercent}% a los contratos seleccionados?`)) return;
    startTransition(async () => {
      await applyIncreaseAction(selectedPeriod, increasePercent, `Aumento ICL / Período ${selectedPeriod}m`);
      setIsIncreaseOpen(false);
      window.location.reload();
    });
  };

  // Generar cuotas
  const handleGenerateQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await generateMonthlyQuotasAction(quotaPeriod, quotaDueDay);
      setQuotaMessage(`¡Se generaron ${res.createdCount} cuotas correctamente para el período ${quotaPeriod}!`);
      setTimeout(() => {
        setIsQuotaOpen(false);
        setQuotaMessage('');
        window.location.reload();
      }, 1500);
    });
  };

  // Finalizar contrato
  const handleTerminate = async (id: string, type: 'PROPERTY' | 'GARAGE') => {
    if (!confirm('¿Seguro que deseás dar por terminado este contrato?')) return;
    startTransition(async () => {
      await terminateLeaseAction(id, type);
      window.location.reload();
    });
  };

  // Crear nuevo contrato
  const handleCreateContract = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const contractType = formData.get('contractType') as string;

    if (contractType === 'PROPERTY') {
      const data = {
        propertyId: formData.get('propertyId') as string,
        renterId: formData.get('renterId') as string,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
        rent: parseFloat(formData.get('rent') as string),
        deposit: parseFloat(formData.get('deposit') as string || '0'),
        updatePeriodMonths: parseInt(formData.get('updatePeriodMonths') as string, 10),
      };

      startTransition(async () => {
        await createPropertyLeaseAction(data);
        setIsNewContractOpen(false);
        window.location.reload();
      });
    } else {
      const selectedSpaces = formData.getAll('spaceIds') as string[];
      const data = {
        renterId: formData.get('renterId') as string,
        spaceIds: selectedSpaces,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
        rentPerSpace: parseFloat(formData.get('rentPerSpace') as string || '0'),
        totalRent: parseFloat(formData.get('totalRent') as string),
        deposit: parseFloat(formData.get('deposit') as string || '0'),
      };

      startTransition(async () => {
        await createGarageLeaseAction(data);
        setIsNewContractOpen(false);
        window.location.reload();
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('PROPERTIES')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'PROPERTIES'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Inmuebles ({propertyLeases.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GARAGES')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'GARAGES'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            <span>Cocheras ({garageLeases.length})</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsNewContractOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Contrato</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsIncreaseOpen(true);
              handleSimulateIncrease();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Aumento IPC/ICL</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQuotaOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Generar Cuotas</span>
          </button>
        </div>
      </div>

      {/* Property Leases Table */}
      {activeTab === 'PROPERTIES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3">Inmueble</th>
                  <th className="px-5 py-3">Inquilino</th>
                  <th className="px-5 py-3">Vigencia</th>
                  <th className="px-5 py-3">Alquiler Actual</th>
                  <th className="px-5 py-3">Ajuste Cada</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {propertyLeases.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900 block text-sm">
                        {l.propertyCode}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate max-w-[180px] block">
                        {l.propertyAddress}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {l.renterName}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {formatDate(l.startDate)} al {formatDate(l.endDate)}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-extrabold text-sm text-slate-900">
                      {formatCurrency(l.currentRent)}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-indigo-600">
                      {l.updatePeriodMonths} meses
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'CURRENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {l.status === 'CURRENT' ? 'Vigente' : 'Terminado'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {l.status === 'CURRENT' && (
                        <button
                          type="button"
                          onClick={() => handleTerminate(l.id, 'PROPERTY')}
                          className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md font-semibold transition-colors"
                        >
                          Finalizar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Garage Leases Table */}
      {activeTab === 'GARAGES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3">Inquilino</th>
                  <th className="px-5 py-3">Plazas Asignadas</th>
                  <th className="px-5 py-3">Vigencia</th>
                  <th className="px-5 py-3">Alquiler Total</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {garageLeases.map((gl) => (
                  <tr key={gl.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      {gl.renterName}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded-md text-xs">
                        {gl.spacesDescription}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {formatDate(gl.startDate)} al {formatDate(gl.endDate)}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-extrabold text-sm text-slate-900">
                      {formatCurrency(gl.totalRent)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          gl.status === 'CURRENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {gl.status === 'CURRENT' ? 'Vigente' : 'Terminado'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {gl.status === 'CURRENT' && (
                        <button
                          type="button"
                          onClick={() => handleTerminate(gl.id, 'GARAGE')}
                          className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md font-semibold transition-colors"
                        >
                          Finalizar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Aumento de Alquiler (Simulador & Aplicar) */}
      {isIncreaseOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  <span>Actualización de Alquileres (ICL / IPC)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Índice ICL oficial de referencia: <span className="font-bold text-indigo-600">{currentIclValue.toFixed(4)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsIncreaseOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Frecuencia de Ajuste
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value={3}>Cada 3 meses</option>
                  <option value={4}>Cada 4 meses (Estándar)</option>
                  <option value={6}>Cada 6 meses</option>
                  <option value={12}>Cada 12 meses (Anual)</option>
                  <option value={0}>Todos los contratos vigentes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Porcentaje de Aumento (%)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={increasePercent}
                    onChange={(e) => setIncreasePercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleSimulateIncrease}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    Calcular
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Contratos Afectados ({previewRows.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Inmueble</th>
                      <th className="px-3 py-2">Inquilino</th>
                      <th className="px-3 py-2">Alquiler Actual</th>
                      <th className="px-3 py-2">Nuevo Alquiler</th>
                      <th className="px-3 py-2 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((r) => (
                      <tr key={r.leaseId}>
                        <td className="px-3 py-2 font-mono font-bold">{r.propertyCode}</td>
                        <td className="px-3 py-2">{r.renterName}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{formatCurrency(r.oldRent)}</td>
                        <td className="px-3 py-2 font-mono font-bold text-emerald-600">{formatCurrency(r.newRent)}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-right text-indigo-600">
                          +{formatCurrency(r.diff)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsIncreaseOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || previewRows.length === 0}
                onClick={handleApplyIncrease}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {isPending ? 'Aplicando...' : `Aplicar Aumento a ${previewRows.length} Contratos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Generación Masiva de Cuotas */}
      {isQuotaOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Generar Cuotas Mensuales</span>
            </h3>

            {quotaMessage ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{quotaMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleGenerateQuotas} className="space-y-4">
                <p className="text-xs text-slate-500">
                  Esta acción generará automáticamente las deudas de alquiler correspondientes para todos los contratos de inmuebles y cocheras vigentes. No generará duplicados si ya existen.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mes y Año de la Cuota *
                  </label>
                  <input
                    type="month"
                    required
                    value={quotaPeriod}
                    onChange={(e) => setQuotaPeriod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Día de Vencimiento del Mes *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={quotaDueDay}
                    onChange={(e) => setQuotaDueDay(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Por defecto: Día 10 del mes seleccionado.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsQuotaOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    {isPending ? 'Generando...' : 'Confirmar y Generar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Nuevo Contrato */}
      {isNewContractOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">Crear Nuevo Contrato</h3>

            <form onSubmit={handleCreateContract} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Contrato *
                </label>
                <select
                  name="contractType"
                  defaultValue="PROPERTY"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800"
                >
                  <option value="PROPERTY">Inmueble (Casa/Dpto/Local)</option>
                  <option value="GARAGE">Cochera / Garaje</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inmueble / Propiedad (Solo para Inmueble)
                </label>
                <select
                  name="propertyId"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="">Seleccionar Inmueble disponible...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inquilino Titular *
                </label>
                <select
                  name="renterId"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="">Seleccionar Inquilino...</option>
                  {renters.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} (DNI: {r.dni})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Finalización *
                  </label>
                  <input
                    name="endDate"
                    type="date"
                    required
                    defaultValue={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2)
                      .toISOString()
                      .slice(0, 10)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alquiler Inicial ($) *
                  </label>
                  <input
                    name="rent"
                    type="number"
                    step="100"
                    required
                    placeholder="Ej: 300000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Depósito en Garantía ($)
                  </label>
                  <input
                    name="deposit"
                    type="number"
                    step="100"
                    defaultValue="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ajuste Escalonado (Meses)
                </label>
                <select
                  name="updatePeriodMonths"
                  defaultValue="4"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="3">Cada 3 meses</option>
                  <option value="4">Cada 4 meses (Recomendado)</option>
                  <option value="6">Cada 6 meses</option>
                  <option value="12">Cada 12 meses</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewContractOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {isPending ? 'Guardando...' : 'Crear Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
