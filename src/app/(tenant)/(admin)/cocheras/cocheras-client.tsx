'use client';

import { useState, useTransition } from 'react';
import {
  Warehouse,
  Plus,
  Car,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { saveGarageAction, toggleSpaceStatusAction } from '@/actions/garages';

interface SpaceItem {
  id: string;
  spaceNumber: string;
  status: 'FREE' | 'OCCUPIED' | 'MAINTENANCE';
  renterName?: string | null;
  leaseId?: string | null;
}

interface GarageItem {
  id: string;
  name: string;
  address: string;
  totalSpaces: number;
  occupied: number;
  free: number;
  spaces: SpaceItem[];
}

export function CocherasClient({ initialGarages }: { initialGarages: GarageItem[] }) {
  const [garages, setGarages] = useState(initialGarages);
  const [selectedGarageId, setSelectedGarageId] = useState<string>(
    initialGarages[0]?.id || ''
  );

  // Modal New Garage
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentGarage = garages.find((g) => g.id === selectedGarageId) || garages[0];

  const handleCreateGarage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      totalSpaces: parseInt(formData.get('totalSpaces') as string, 10),
    };

    startTransition(async () => {
      await saveGarageAction(data);
      setIsModalOpen(false);
      window.location.reload();
    });
  };

  const handleToggleStatus = async (spaceId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'FREE' ? 'OCCUPIED' : 'FREE';
    startTransition(async () => {
      await toggleSpaceStatusAction(spaceId, nextStatus as any);
      window.location.reload();
    });
  };

  return (
    <div className="space-y-8">
      {/* Garages Selector & New Garage Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {garages.map((g) => {
            const isSelected = g.id === currentGarage?.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGarageId(g.id)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2.5 flex-shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Warehouse className="w-4 h-4" />
                <span>{g.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {g.occupied}/{g.totalSpaces}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Garaje</span>
        </button>
      </div>

      {currentGarage ? (
        <div className="space-y-6">
          {/* Status Bar */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{currentGarage.name}</h2>
              <p className="text-xs text-slate-500">{currentGarage.address}</p>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-xs" />
                <span className="font-semibold text-slate-700">
                  Libres: <span className="font-mono text-emerald-600">{currentGarage.free}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-indigo-600 shadow-xs" />
                <span className="font-semibold text-slate-700">
                  Ocupadas: <span className="font-mono text-indigo-600">{currentGarage.occupied}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-slate-200" />
                <span className="font-semibold text-slate-500">
                  Total: <span className="font-mono">{currentGarage.totalSpaces}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Visual Grid Map of Garage Spaces */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Car className="w-4 h-4 text-indigo-600" />
              <span>Mapa Visual de Plazas</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3.5">
              {currentGarage.spaces.map((s) => {
                const isOccupied = s.status === 'OCCUPIED';
                return (
                  <div
                    key={s.id}
                    onClick={() => handleToggleStatus(s.id, s.status)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all duration-150 relative group flex flex-col justify-between h-28 ${
                      isOccupied
                        ? 'bg-indigo-50/70 border-indigo-200 hover:border-indigo-400'
                        : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-extrabold text-base text-slate-900">
                        N° {s.spaceNumber}
                      </span>
                      <Car
                        className={`w-4 h-4 ${
                          isOccupied ? 'text-indigo-600' : 'text-emerald-500 opacity-40'
                        }`}
                      />
                    </div>

                    <div className="overflow-hidden">
                      {isOccupied ? (
                        <div>
                          <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight">
                            Ocupada
                          </p>
                          <p className="text-[11px] font-semibold text-slate-800 truncate mt-0.5">
                            {s.renterName || 'Inquilino asignado'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-emerald-700">Disponible</p>
                      )}
                    </div>

                    <div className="text-[9px] text-slate-400 group-hover:text-slate-600 transition-colors">
                      Click para alternar
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Warehouse className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No hay garajes configurados</p>
        </div>
      )}

      {/* Modal New Garage */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900">Agregar Nuevo Garaje</h3>
            <form onSubmit={handleCreateGarage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Garaje *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Ej: Garaje Bottaro Central"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección *
                </label>
                <input
                  name="address"
                  type="text"
                  required
                  placeholder="Ej: Bottaro 1760"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cantidad Total de Plazas *
                </label>
                <input
                  name="totalSpaces"
                  type="number"
                  min="1"
                  max="500"
                  required
                  defaultValue="20"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Las plazas (1 a N) se generarán automáticamente en el mapa interactivo.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  {isPending ? 'Creando...' : 'Crear Garaje'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
