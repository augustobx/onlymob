'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, FileSpreadsheet, Home, Plus, TrendingUp, Warehouse } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { adjustmentMethodLabel } from '@/lib/lease-labels';
import {
  applyIncreaseAction,
  createGarageLeaseAction,
  createPropertyLeaseAction,
  generateMonthlyQuotasAction,
  previewIncreaseAction,
  terminateLeaseAction,
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
  adjustmentMethod?: string | null;
  adjustmentIndex?: string | null;
  nextAdjustmentDate?: Date | null;
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

interface PropertyOption { id: string; code: string; address: string; baseRent: number | null }
interface RenterOption { id: string; fullName: string; dni: string }
interface SpaceOption { id: string; spaceNumber: string; garageName: string }

type ContractType = 'PROPERTY' | 'GARAGE';

export function ContractsClient({
  propertyLeases,
  garageLeases,
  properties,
  renters,
  availableSpaces,
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
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isIncreaseOpen, setIsIncreaseOpen] = useState(false);
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const [newContractType, setNewContractType] = useState<ContractType>('PROPERTY');
  const [actionError, setActionError] = useState('');

  const [selectedPeriod, setSelectedPeriod] = useState(4);
  const [increasePercent, setIncreasePercent] = useState(15);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [quotaPeriod, setQuotaPeriod] = useState(currentMonth);
  const [quotaDueDay, setQuotaDueDay] = useState(10);
  const [quotaMessage, setQuotaMessage] = useState('');

  function run(task: () => Promise<void>) {
    setActionError('');
    startTransition(async () => {
      try { await task(); }
      catch (error) { setActionError(error instanceof Error ? error.message : 'No se pudo completar la operación.'); }
    });
  }

  const handleSimulateIncrease = () => run(async () => {
    const rows = await previewIncreaseAction(selectedPeriod, increasePercent);
    setPreviewRows(rows);
  });

  const handleApplyIncrease = () => {
    if (!confirm(`¿Confirmás aplicar un aumento manual del ${increasePercent}% a ${previewRows.length} contrato/s? Los contratos ICL no se incluyen.`)) return;
    run(async () => {
      await applyIncreaseAction(selectedPeriod, increasePercent, `Ajuste manual ${increasePercent}%`);
      setIsIncreaseOpen(false);
      window.location.reload();
    });
  };

  const handleGenerateQuotas = (event: React.FormEvent) => {
    event.preventDefault();
    run(async () => {
      const result = await generateMonthlyQuotasAction(quotaPeriod, quotaDueDay);
      setQuotaMessage(`Se generaron ${result.createdCount} cuotas para ${quotaPeriod}.`);
      setTimeout(() => window.location.reload(), 900);
    });
  };

  const handleTerminate = (id: string, type: ContractType) => {
    if (!confirm('¿Seguro que deseás dar por terminado este contrato?')) return;
    run(async () => { await terminateLeaseAction(id, type); window.location.reload(); });
  };

  const handleCreateContract = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    run(async () => {
      if (newContractType === 'PROPERTY') {
        await createPropertyLeaseAction({
          propertyId: String(formData.get('propertyId') || ''),
          renterId: String(formData.get('renterId') || ''),
          startDate: String(formData.get('startDate') || ''),
          endDate: String(formData.get('endDate') || ''),
          rent: Number(formData.get('rent')),
          deposit: Number(formData.get('deposit') || 0),
          updatePeriodMonths: Number(formData.get('updatePeriodMonths') || 4),
          adjustmentMethod: String(formData.get('adjustmentMethod') || 'ICL'),
          adjustmentIndex: String(formData.get('adjustmentMethod') || 'ICL') === 'ICL' ? 'ICL' : null,
          notes: String(formData.get('notes') || '') || undefined,
        });
      } else {
        await createGarageLeaseAction({
          renterId: String(formData.get('renterId') || ''),
          spaceIds: formData.getAll('spaceIds').map(String),
          startDate: String(formData.get('startDate') || ''),
          endDate: String(formData.get('endDate') || ''),
          rentPerSpace: Number(formData.get('rentPerSpace') || 0),
          totalRent: Number(formData.get('totalRent') || 0),
          deposit: Number(formData.get('deposit') || 0),
          notes: String(formData.get('notes') || '') || undefined,
        });
      }
      setIsNewContractOpen(false);
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      {actionError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{actionError}</div>}

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center gap-2 rounded-lg bg-slate-100 p-1 md:w-auto">
          <button type="button" onClick={() => setActiveTab('PROPERTIES')} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-bold md:flex-none ${activeTab === 'PROPERTIES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}><Home className="h-3.5 w-3.5" /> Inmuebles ({propertyLeases.length})</button>
          <button type="button" onClick={() => setActiveTab('GARAGES')} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-bold md:flex-none ${activeTab === 'GARAGES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}><Warehouse className="h-3.5 w-3.5" /> Cocheras ({garageLeases.length})</button>
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2.5 md:w-auto">
          <button type="button" onClick={() => { setActionError(''); setNewContractType('PROPERTY'); setIsNewContractOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"><Plus className="h-3.5 w-3.5" /> Nuevo contrato</button>
          <button type="button" onClick={() => { setActionError(''); setPreviewRows([]); setIsIncreaseOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-600"><TrendingUp className="h-3.5 w-3.5" /> Aumento manual masivo</button>
          <button type="button" onClick={() => { setActionError(''); setIsQuotaOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"><FileSpreadsheet className="h-3.5 w-3.5" /> Generar cuotas</button>
        </div>
      </div>

      {activeTab === 'PROPERTIES' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto"><table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600"><tr><th className="px-5 py-3">Inmueble</th><th className="px-5 py-3">Inquilino</th><th className="px-5 py-3">Vigencia</th><th className="px-5 py-3">Alquiler</th><th className="px-5 py-3">Ajuste</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{propertyLeases.map((lease) => <tr key={lease.id} className="hover:bg-slate-50/70">
              <td className="px-5 py-3.5"><span className="block font-mono text-sm font-bold text-slate-900">{lease.propertyCode}</span><span className="block max-w-[220px] truncate text-[11px] text-slate-500">{lease.propertyAddress}</span></td>
              <td className="px-5 py-3.5 font-medium text-slate-800">{lease.renterName}</td>
              <td className="px-5 py-3.5 text-slate-600">{formatDate(lease.startDate)} al {formatDate(lease.endDate)}</td>
              <td className="px-5 py-3.5 font-mono text-sm font-extrabold text-slate-900">{formatCurrency(lease.currentRent)}</td>
              <td className="px-5 py-3.5"><span className="block font-semibold text-indigo-700">{adjustmentMethodLabel(lease.adjustmentMethod)}</span><span className="text-[11px] text-slate-500">Cada {lease.updatePeriodMonths} meses</span></td>
              <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${['CURRENT','EXPIRING'].includes(lease.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{lease.status === 'CURRENT' ? 'Vigente' : lease.status === 'EXPIRING' ? 'Por vencer' : 'Terminado'}</span></td>
              <td className="px-5 py-3.5 text-right">{['CURRENT','EXPIRING'].includes(lease.status) && <button type="button" onClick={() => handleTerminate(lease.id, 'PROPERTY')} className="rounded-md px-2.5 py-1 font-semibold text-rose-600 hover:bg-rose-50">Finalizar</button>}</td>
            </tr>)}</tbody>
          </table></div>
        </div>
      )}

      {activeTab === 'GARAGES' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto"><table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600"><tr><th className="px-5 py-3">Inquilino</th><th className="px-5 py-3">Plazas</th><th className="px-5 py-3">Vigencia</th><th className="px-5 py-3">Alquiler</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{garageLeases.map((lease) => <tr key={lease.id} className="hover:bg-slate-50/70">
              <td className="px-5 py-3.5 font-bold text-slate-800">{lease.renterName}</td><td className="px-5 py-3.5"><span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono font-bold text-indigo-700">{lease.spacesDescription}</span></td><td className="px-5 py-3.5 text-slate-600">{formatDate(lease.startDate)} al {formatDate(lease.endDate)}</td><td className="px-5 py-3.5 font-mono text-sm font-extrabold">{formatCurrency(lease.totalRent)}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${lease.status === 'CURRENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{lease.status === 'CURRENT' ? 'Vigente' : 'Terminado'}</span></td><td className="px-5 py-3.5 text-right">{lease.status === 'CURRENT' && <button type="button" onClick={() => handleTerminate(lease.id, 'GARAGE')} className="rounded-md px-2.5 py-1 font-semibold text-rose-600 hover:bg-rose-50">Finalizar</button>}</td>
            </tr>)}</tbody>
          </table></div>
        </div>
      )}

      {isIncreaseOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"><div className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="border-b border-slate-100 pb-3"><h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><TrendingUp className="h-5 w-5 text-amber-500" /> Aumento manual masivo</h3><p className="mt-1 text-xs text-slate-500">Sólo incluye contratos configurados como <strong>Manual</strong> o <strong>Porcentaje fijo</strong>. Los contratos ICL se actualizan individualmente desde Propiedad 360/Contrato 360 usando el índice oficial.</p></div>
        {actionError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{actionError}</div>}
        <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-slate-700">Frecuencia</label><select value={selectedPeriod} onChange={(e) => setSelectedPeriod(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value={3}>Cada 3 meses</option><option value={4}>Cada 4 meses</option><option value={6}>Cada 6 meses</option><option value={12}>Cada 12 meses</option><option value={0}>Todos los manuales vigentes</option></select></div><div><label className="mb-1 block text-xs font-semibold text-slate-700">Porcentaje (%)</label><div className="flex gap-2"><input type="number" min="0.01" max="1000" step="0.01" value={increasePercent} onChange={(e) => setIncreasePercent(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono"/><button type="button" onClick={handleSimulateIncrease} disabled={isPending || increasePercent <= 0} className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Calcular</button></div></div></div>
        <div><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Contratos afectados ({previewRows.length})</h4><div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr><th className="px-3 py-2">Inmueble</th><th className="px-3 py-2">Inquilino</th><th className="px-3 py-2">Actual</th><th className="px-3 py-2">Nuevo</th></tr></thead><tbody className="divide-y divide-slate-100">{previewRows.map((row) => <tr key={row.leaseId}><td className="px-3 py-2 font-mono font-bold">{row.propertyCode}</td><td className="px-3 py-2">{row.renterName}</td><td className="px-3 py-2 font-mono">{formatCurrency(row.oldRent)}</td><td className="px-3 py-2 font-mono font-bold text-emerald-600">{formatCurrency(row.newRent)}</td></tr>)}</tbody></table></div></div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-3"><button type="button" onClick={() => setIsIncreaseOpen(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">Cancelar</button><button type="button" disabled={isPending || previewRows.length === 0} onClick={handleApplyIncrease} className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Aplicando...' : `Aplicar a ${previewRows.length} contrato/s`}</button></div>
      </div></div>}

      {isQuotaOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"><div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"><h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Generar cuotas mensuales</h3>{quotaMessage ? <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{quotaMessage}</div> : <form onSubmit={handleGenerateQuotas} className="space-y-4"><p className="text-xs text-slate-500">Genera las deudas mensuales de contratos vigentes sin duplicar conceptos ya existentes.</p><div><label className="mb-1 block text-xs font-semibold">Mes</label><input type="month" required value={quotaPeriod} onChange={(e) => setQuotaPeriod(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></div><div><label className="mb-1 block text-xs font-semibold">Día de vencimiento</label><input type="number" min="1" max="28" required value={quotaDueDay} onChange={(e) => setQuotaDueDay(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></div><div className="flex justify-end gap-3 border-t pt-3"><button type="button" onClick={() => setIsQuotaOpen(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold">Cancelar</button><button disabled={isPending} className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Generando...' : 'Confirmar y generar'}</button></div></form>}</div></div>}

      {isNewContractOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5"><h3 className="text-lg font-bold text-slate-900">Crear nuevo contrato</h3><p className="mt-1 text-xs text-slate-500">Definí desde el alta cómo se actualizará el alquiler.</p></div>{actionError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{actionError}</div>}<form onSubmit={handleCreateContract} className="space-y-4">
        <div><label className="mb-1 block text-xs font-semibold text-slate-700">Tipo de contrato</label><select value={newContractType} onChange={(e) => setNewContractType(e.target.value as ContractType)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold"><option value="PROPERTY">Inmueble</option><option value="GARAGE">Cochera / garaje</option></select></div>
        {newContractType === 'PROPERTY' ? <div><label className="mb-1 block text-xs font-semibold text-slate-700">Propiedad *</label><select name="propertyId" required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="">Seleccionar propiedad disponible...</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.code} · {property.address}</option>)}</select></div> : <div><label className="mb-2 block text-xs font-semibold text-slate-700">Plazas disponibles *</label><div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">{availableSpaces.length ? availableSpaces.map((space) => <label key={space.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="spaceIds" value={space.id}/><span className="font-semibold">{space.garageName}</span><span className="text-slate-500">#{space.spaceNumber}</span></label>) : <p className="text-sm text-slate-500">No hay plazas libres.</p>}</div></div>}
        <div><label className="mb-1 block text-xs font-semibold text-slate-700">Inquilino titular *</label><select name="renterId" required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="">Seleccionar inquilino...</option>{renters.map((renter) => <option key={renter.id} value={renter.id}>{renter.fullName} · DNI {renter.dni}</option>)}</select></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold">Inicio *</label><input name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></div><div><label className="mb-1 block text-xs font-semibold">Finalización *</label><input name="endDate" type="date" required defaultValue={new Date(Date.now()+365*24*60*60*1000*2).toISOString().slice(0,10)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></div></div>
        {newContractType === 'PROPERTY' ? <><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold">Alquiler inicial *</label><input name="rent" type="number" min="0.01" step="0.01" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"/></div><div><label className="mb-1 block text-xs font-semibold">Depósito</label><input name="deposit" type="number" min="0" step="0.01" defaultValue="0" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"/></div></div><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold">Modalidad de aumento *</label><select name="adjustmentMethod" defaultValue="ICL" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold"><option value="ICL">ICL / BCRA</option><option value="MANUAL">Manual</option></select><p className="mt-1 text-[11px] text-slate-500">ICL usa la serie oficial al momento de aplicar cada aumento.</p></div><div><label className="mb-1 block text-xs font-semibold">Frecuencia *</label><select name="updatePeriodMonths" defaultValue="4" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="3">Cada 3 meses</option><option value="4">Cada 4 meses</option><option value="6">Cada 6 meses</option><option value="12">Cada 12 meses</option></select></div></div></> : <><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold">Alquiler por plaza *</label><input name="rentPerSpace" type="number" min="0" step="0.01" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"/></div><div><label className="mb-1 block text-xs font-semibold">Alquiler total *</label><input name="totalRent" type="number" min="0.01" step="0.01" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"/></div></div><div><label className="mb-1 block text-xs font-semibold">Depósito</label><input name="deposit" type="number" min="0" step="0.01" defaultValue="0" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"/></div></>}
        <div><label className="mb-1 block text-xs font-semibold">Notas</label><textarea name="notes" rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIsNewContractOpen(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">Cancelar</button><button type="submit" disabled={isPending || (newContractType === 'GARAGE' && availableSpaces.length === 0)} className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Guardando...' : 'Crear contrato'}</button></div>
      </form></div></div>}
    </div>
  );
}
