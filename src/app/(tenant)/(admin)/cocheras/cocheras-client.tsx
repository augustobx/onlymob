'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Mail,
  Phone,
  Plus,
  ShieldAlert,
  UserRound,
  Warehouse,
  Wrench,
  X,
} from 'lucide-react';
import { getGarageRentersAction, saveGarageAction, toggleSpaceStatusAction } from '@/actions/garages';
import { createGarageLeaseAction, terminateLeaseAction } from '@/actions/leases';
import { formatCurrency, formatDate } from '@/lib/utils';

type SpaceStatus = 'FREE' | 'OCCUPIED' | 'MAINTENANCE';

interface GarageLeaseInfo {
  id: string;
  renterId: string;
  renterName: string;
  renterDni: string;
  renterPhone?: string | null;
  renterEmail?: string | null;
  startDate: string;
  endDate: string;
  rentPerSpace: number;
  totalRent: number;
  deposit: number;
  increasePercent: number;
  status: string;
  notes?: string | null;
  pendingDebtTotal: number;
  spacesDescription: string;
}

interface SpaceItem {
  id: string;
  spaceNumber: string;
  status: SpaceStatus;
  renterName?: string | null;
  leaseId?: string | null;
  lease?: GarageLeaseInfo | null;
}

interface GarageItem {
  id: string;
  name: string;
  address: string;
  totalSpaces: number;
  occupied: number;
  free: number;
  maintenance: number;
  orphaned: number;
  spaces: SpaceItem[];
}

interface RenterOption {
  id: string;
  fullName: string;
  dni: string;
  email?: string | null;
  phone?: string | null;
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function isoNextYear() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export function CocherasClient({ initialGarages, renters }: { initialGarages: GarageItem[]; renters: RenterOption[] }) {
  const [garages] = useState(initialGarages);
  const [selectedGarageId, setSelectedGarageId] = useState<string>(initialGarages[0]?.id || '');
  const [isGarageModalOpen, setIsGarageModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<GarageLeaseInfo | null>(null);
  const [selectedOrphan, setSelectedOrphan] = useState<SpaceItem | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<SpaceItem | null>(null);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [rentPerSpace, setRentPerSpace] = useState(0);
  const [totalRent, setTotalRent] = useState(0);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const currentGarage = garages.find((garage) => garage.id === selectedGarageId) || garages[0];
  const selectableSpaces = useMemo(
    () => currentGarage?.spaces.filter((space) => space.status === 'FREE' || (space.status === 'OCCUPIED' && !space.lease)) || [],
    [currentGarage],
  );

  function run(task: () => Promise<void>) {
    setError('');
    startTransition(async () => {
      try {
        await task();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo completar la operación.');
      }
    });
  }

  function openContractForSpace(space: SpaceItem) {
    setError('');
    setSelectedOrphan(null);
    setSelectedMaintenance(null);
    setSelectedLease(null);
    setSelectedSpaceIds([space.id]);
    setRentPerSpace(0);
    setTotalRent(0);
    setIsContractModalOpen(true);
  }

  function handleSpaceClick(space: SpaceItem) {
    setError('');
    if (space.lease) {
      setSelectedLease(space.lease);
      return;
    }
    if (space.status === 'MAINTENANCE') {
      setSelectedMaintenance(space);
      return;
    }
    if (space.status === 'OCCUPIED') {
      setSelectedOrphan(space);
      return;
    }
    openContractForSpace(space);
  }

  function toggleContractSpace(spaceId: string) {
    setSelectedSpaceIds((current) => {
      const next = current.includes(spaceId) ? current.filter((id) => id !== spaceId) : [...current, spaceId];
      if (rentPerSpace > 0) setTotalRent(rentPerSpace * next.length);
      return next;
    });
  }

  function handleRentPerSpaceChange(value: number) {
    const safe = Number.isFinite(value) ? value : 0;
    setRentPerSpace(safe);
    setTotalRent(safe * selectedSpaceIds.length);
  }

  function handleCreateGarage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    run(async () => {
      await saveGarageAction({
        name: String(formData.get('name') || ''),
        address: String(formData.get('address') || ''),
        totalSpaces: Number(formData.get('totalSpaces') || 0),
      });
      setIsGarageModalOpen(false);
      window.location.reload();
    });
  }

  function handleCreateContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    run(async () => {
      await createGarageLeaseAction({
        renterId: String(formData.get('renterId') || ''),
        spaceIds: selectedSpaceIds,
        startDate: String(formData.get('startDate') || ''),
        endDate: String(formData.get('endDate') || ''),
        rentPerSpace: Number(formData.get('rentPerSpace') || 0),
        totalRent: Number(formData.get('totalRent') || 0),
        deposit: Number(formData.get('deposit') || 0),
        notes: String(formData.get('notes') || '') || undefined,
      });
      setIsContractModalOpen(false);
      window.location.reload();
    });
  }

  function freeOrphan(space: SpaceItem) {
    run(async () => {
      await toggleSpaceStatusAction(space.id, 'FREE');
      setSelectedOrphan(null);
      window.location.reload();
    });
  }

  function restoreMaintenance(space: SpaceItem) {
    run(async () => {
      await toggleSpaceStatusAction(space.id, 'FREE');
      setSelectedMaintenance(null);
      window.location.reload();
    });
  }

  function terminateSelectedLease() {
    if (!selectedLease) return;
    if (!confirm(`¿Finalizar el contrato de ${selectedLease.renterName}? Las plazas asociadas quedarán libres.`)) return;
    run(async () => {
      await terminateLeaseAction(selectedLease.id, 'GARAGE');
      setSelectedLease(null);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {garages.map((garage) => {
            const isSelected = garage.id === currentGarage?.id;
            return (
              <button
                key={garage.id}
                type="button"
                onClick={() => setSelectedGarageId(garage.id)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 flex-shrink-0 ${isSelected ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <Warehouse className="w-4 h-4" />
                <span>{garage.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {garage.occupied}/{garage.totalSpaces}
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={() => setIsGarageModalOpen(true)} className="btn-primary flex-shrink-0">
          <Plus className="w-4 h-4" /> Nuevo garaje
        </button>
      </div>

      {currentGarage ? (
        <div className="space-y-5">
          <section className="section-card">
            <div className="section-card__body flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-[.14em] font-bold text-indigo-600">Mapa de cocheras</p>
                <h2 className="text-lg font-bold text-slate-950 mt-1">{currentGarage.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{currentGarage.address}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <Counter dot="bg-emerald-500" label="Libres" value={currentGarage.free} />
                <Counter dot="bg-indigo-600" label="Alquiladas" value={currentGarage.occupied - currentGarage.orphaned} />
                <Counter dot="bg-slate-400" label="Mantenimiento" value={currentGarage.maintenance} />
                {currentGarage.orphaned > 0 && <Counter dot="bg-amber-500" label="Sin contrato" value={currentGarage.orphaned} />}
              </div>
            </div>
          </section>

          {currentGarage.orphaned > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 mt-0.5 flex-none" />
              <div><b>{currentGarage.orphaned} plaza/s quedaron marcadas como ocupadas sin contrato.</b><p className="mt-1 text-amber-800">Hacé click sobre ellas para crear el contrato correcto o liberarlas.</p></div>
            </div>
          )}

          <section className="section-card">
            <div className="section-card__header">
              <div><h3 className="section-card__title">Plazas</h3><p className="section-card__subtitle">Una plaza libre abre el alta de contrato. Una alquilada abre su contrato vigente.</p></div>
            </div>
            <div className="section-card__body">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3.5">
                {currentGarage.spaces.map((space) => {
                  const orphan = space.status === 'OCCUPIED' && !space.lease;
                  const occupied = Boolean(space.lease);
                  const maintenance = space.status === 'MAINTENANCE';
                  const cardClass = orphan
                    ? 'bg-amber-50 border-amber-300 hover:border-amber-500'
                    : occupied
                      ? 'bg-indigo-50/80 border-indigo-200 hover:border-indigo-400'
                      : maintenance
                        ? 'bg-slate-100 border-slate-300 hover:border-slate-400'
                        : 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-400';
                  const iconClass = orphan ? 'text-amber-600' : occupied ? 'text-indigo-600' : maintenance ? 'text-slate-500' : 'text-emerald-500';

                  return (
                    <button
                      key={space.id}
                      type="button"
                      onClick={() => handleSpaceClick(space)}
                      className={`p-4 rounded-xl border transition-all text-left relative flex flex-col justify-between h-32 ${cardClass}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-extrabold text-base text-slate-900">N° {space.spaceNumber}</span>
                        {maintenance ? <Wrench className={`w-4 h-4 ${iconClass}`} /> : <Car className={`w-4 h-4 ${iconClass}`} />}
                      </div>
                      <div className="min-w-0">
                        {orphan ? (
                          <><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Sin contrato</p><p className="text-[10px] text-amber-800 mt-1">Corregir asignación</p></>
                        ) : occupied ? (
                          <><p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Alquilada</p><p className="text-[11px] font-semibold text-slate-800 truncate mt-1">{space.renterName}</p></>
                        ) : maintenance ? (
                          <><p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Mantenimiento</p><p className="text-[10px] text-slate-500 mt-1">Ver estado</p></>
                        ) : (
                          <><p className="text-xs font-bold text-emerald-700">Disponible</p><p className="text-[10px] text-emerald-700 mt-1">Crear contrato</p></>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Warehouse className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No hay garajes configurados</p>
        </div>
      )}

      {isGarageModalOpen && (
        <Modal title="Agregar nuevo garaje" subtitle="Las plazas se generan automáticamente." onClose={() => setIsGarageModalOpen(false)}>
          <form onSubmit={handleCreateGarage} className="space-y-4">
            <Field name="name" label="Nombre del garaje *" required placeholder="Ej: Garaje Centro" />
            <Field name="address" label="Dirección *" required placeholder="Ej: Nación 920" />
            <Field name="totalSpaces" label="Cantidad de plazas *" type="number" required min="1" max="500" defaultValue="20" />
            <ModalActions onCancel={() => setIsGarageModalOpen(false)} pending={isPending} submitLabel="Crear garaje" />
          </form>
        </Modal>
      )}

      {isContractModalOpen && currentGarage && (
        <Modal title="Crear contrato de cochera" subtitle={`${currentGarage.name} · elegí titular, plazas y valores.`} onClose={() => setIsContractModalOpen(false)} wide>
          <form onSubmit={handleCreateContract} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <label className="md:col-span-2"><span className="form-label">Inquilino titular *</span><select name="renterId" required className="form-input"><option value="">Seleccionar inquilino...</option>{renters.map((renter) => <option key={renter.id} value={renter.id}>{renter.fullName} · DNI {renter.dni}</option>)}</select></label>
              <Field name="startDate" label="Inicio *" type="date" required defaultValue={isoToday()} />
              <Field name="endDate" label="Finalización *" type="date" required defaultValue={isoNextYear()} />
            </div>

            <div>
              <span className="form-label">Plazas incluidas *</span>
              <div className="mt-1 grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-3 bg-slate-50">
                {selectableSpaces.map((space) => {
                  const checked = selectedSpaceIds.includes(space.id);
                  const orphan = space.status === 'OCCUPIED' && !space.lease;
                  return <label key={space.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer ${checked ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'}`}><input type="checkbox" checked={checked} onChange={() => toggleContractSpace(space.id)} /><Car className="w-4 h-4 text-slate-500"/><span className="font-semibold text-sm">Plaza #{space.spaceNumber}</span>{orphan&&<span className="ml-auto text-[10px] font-bold text-amber-700">SIN CONTRATO</span>}</label>;
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Seleccionadas: <b>{selectedSpaceIds.length}</b></p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <label><span className="form-label">Alquiler por plaza *</span><input name="rentPerSpace" type="number" min="0.01" step="0.01" required value={rentPerSpace || ''} onChange={(event) => handleRentPerSpaceChange(Number(event.target.value))} className="form-input" /></label>
              <label><span className="form-label">Alquiler total *</span><input name="totalRent" type="number" min="0.01" step="0.01" required value={totalRent || ''} onChange={(event) => setTotalRent(Number(event.target.value))} className="form-input" /></label>
              <Field name="deposit" label="Depósito" type="number" min="0" step="0.01" defaultValue="0" />
            </div>
            <label><span className="form-label">Observaciones</span><textarea name="notes" rows={3} className="form-input" /></label>
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-none"/><span>Al confirmar se crea el contrato real y las plazas pasan a ocupadas vinculadas al inquilino. Ya no se puede marcar una plaza ocupada sin contrato desde el mapa.</span></div>
            <ModalActions onCancel={() => setIsContractModalOpen(false)} pending={isPending} submitLabel="Crear contrato" disabled={selectedSpaceIds.length === 0} />
          </form>
        </Modal>
      )}

      {selectedLease && (
        <Modal title="Contrato de cochera" subtitle={selectedLease.spacesDescription} onClose={() => setSelectedLease(null)} wide>
          <div className="space-y-5">
            <div className="rounded-2xl bg-slate-950 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div><p className="text-[10px] uppercase tracking-[.14em] font-bold text-indigo-300">Titular</p><h3 className="text-xl font-bold mt-1">{selectedLease.renterName}</h3><p className="text-xs text-slate-400 mt-1">DNI {selectedLease.renterDni}</p></div>
              <div className="sm:text-right"><p className="text-[10px] uppercase tracking-wide text-slate-400">Alquiler mensual</p><p className="text-2xl font-black mt-1">{formatCurrency(selectedLease.totalRent)}</p></div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Info icon={<CalendarDays/>} label="Vigencia" value={`${formatDate(selectedLease.startDate)} al ${formatDate(selectedLease.endDate)}`} />
              <Info icon={<CircleDollarSign/>} label="Por plaza" value={formatCurrency(selectedLease.rentPerSpace)} />
              <Info icon={<CircleDollarSign/>} label="Depósito" value={formatCurrency(selectedLease.deposit)} />
              <Info icon={<AlertTriangle/>} label="Saldo pendiente" value={formatCurrency(selectedLease.pendingDebtTotal)} warning={selectedLease.pendingDebtTotal > 0} />
              <Info icon={<Phone/>} label="Teléfono" value={selectedLease.renterPhone || 'Sin teléfono'} />
              <Info icon={<Mail/>} label="Email" value={selectedLease.renterEmail || 'Sin email'} />
            </div>
            {selectedLease.notes && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] uppercase font-bold text-slate-400">Observaciones</p><p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{selectedLease.notes}</p></div>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4 border-t border-slate-200">
              <button type="button" onClick={() => setSelectedLease(null)} className="btn-secondary">Cerrar</button>
              {selectedLease.status === 'CURRENT' && <button type="button" disabled={isPending} onClick={terminateSelectedLease} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">Finalizar contrato</button>}
            </div>
          </div>
        </Modal>
      )}

      {selectedOrphan && (
        <Modal title={`Plaza #${selectedOrphan.spaceNumber} sin contrato`} subtitle="Está marcada como ocupada pero no tiene un contrato vigente asociado." onClose={() => setSelectedOrphan(null)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3"><ShieldAlert className="w-5 h-5 flex-none"/><p>Esto corresponde al comportamiento anterior del mapa. Podés corregirlo creando el contrato real o liberando la plaza.</p></div>
            <div className="flex flex-col sm:flex-row justify-end gap-2"><button type="button" disabled={isPending} onClick={() => freeOrphan(selectedOrphan)} className="btn-secondary">Liberar plaza</button><button type="button" onClick={() => openContractForSpace(selectedOrphan)} className="btn-primary"><UserRound className="w-4 h-4"/> Crear contrato</button></div>
          </div>
        </Modal>
      )}

      {selectedMaintenance && (
        <Modal title={`Plaza #${selectedMaintenance.spaceNumber}`} subtitle="Plaza fuera de disponibilidad por mantenimiento." onClose={() => setSelectedMaintenance(null)}>
          <div className="space-y-4"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3 text-sm text-slate-700"><Wrench className="w-5 h-5 flex-none"/><p>Mientras esté en mantenimiento no se puede incluir en un contrato.</p></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setSelectedMaintenance(null)} className="btn-secondary">Cerrar</button><button type="button" disabled={isPending} onClick={() => restoreMaintenance(selectedMaintenance)} className="btn-primary">Marcar disponible</button></div></div>
        </Modal>
      )}
    </div>
  );
}

function Counter({ dot, label, value }: { dot: string; label: string; value: number }) {
  return <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className={`w-2.5 h-2.5 rounded-full ${dot}`} /><span className="text-slate-600">{label}</span><b className="text-slate-900">{value}</b></div>;
}

function Modal({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4"><div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}><div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4"><div><h3 className="text-lg font-bold text-slate-950">{title}</h3>{subtitle&&<p className="text-xs text-slate-500 mt-1">{subtitle}</p>}</div><button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="w-4 h-4"/></button></div><div className="p-5">{children}</div></div></div>;
}

function ModalActions({ onCancel, pending, submitLabel, disabled = false }: { onCancel: () => void; pending: boolean; submitLabel: string; disabled?: boolean }) {
  return <div className="flex justify-end gap-2 pt-4 border-t border-slate-100"><button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button><button type="submit" disabled={pending || disabled} className="btn-primary">{pending ? 'Guardando...' : submitLabel}</button></div>;
}

function Field({ name, label, type = 'text', required, placeholder, defaultValue, min, max, step }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string; min?: string; max?: string; step?: string }) {
  return <label><span className="form-label">{label}</span><input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} min={min} max={max} step={step} className="form-input" /></label>;
}

function Info({ icon, label, value, warning = false }: { icon: React.ReactNode; label: string; value: string; warning?: boolean }) {
  return <div className={`rounded-xl border p-4 ${warning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}><div className={`w-8 h-8 rounded-lg flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 ${warning ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>{icon}</div><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mt-3">{label}</p><p className={`text-sm font-semibold mt-1 ${warning ? 'text-amber-900' : 'text-slate-900'}`}>{value}</p></div>;
}
