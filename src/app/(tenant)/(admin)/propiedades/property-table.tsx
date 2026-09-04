'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Building,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { savePropertyAction, deletePropertyAction } from '@/actions/properties';

interface PropertyItem {
  id: string;
  code: string;
  address: string;
  type: string;
  rooms: number | null;
  sqm: number | null;
  baseRent: number | null;
  expensesShare: number | null;
  status: string;
  notes?: string | null;
  activeLease?: {
    id: string;
    currentRent: number;
    startDate: Date;
    endDate: Date;
    renterName: string;
    renterPhone?: string | null;
    renterEmail?: string | null;
    pendingDebtTotal: number;
  } | null;
}

export function PropertyTable({ initialProperties }: { initialProperties: PropertyItem[] }) {
  const [properties, setProperties] = useState(initialProperties);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter properties
  const filtered = properties
    .filter((p) => {
      const matchSearch =
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.address.toLowerCase().includes(search.toLowerCase()) ||
        (p.activeLease?.renterName || '').toLowerCase().includes(search.toLowerCase());
      const matchType = selectedType === 'ALL' || p.type === selectedType;
      const matchStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
      return matchSearch && matchType && matchStatus;
    })
    .sort((a, b) => {
      const numA = parseInt(a.code, 10);
      const numB = parseInt(b.code, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }
      return sortAsc ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
    });

  const handleOpenModal = (property?: PropertyItem) => {
    setEditingProperty(property || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProperty(null);
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      id: editingProperty?.id,
      code: formData.get('code') as string,
      address: formData.get('address') as string,
      type: formData.get('type') as any,
      rooms: formData.get('rooms') ? parseInt(formData.get('rooms') as string, 10) : null,
      sqm: formData.get('sqm') ? parseFloat(formData.get('sqm') as string) : null,
      baseRent: formData.get('baseRent') ? parseFloat(formData.get('baseRent') as string) : null,
      expensesShare: formData.get('expensesShare') ? parseFloat(formData.get('expensesShare') as string) : null,
      notes: (formData.get('notes') as string) || undefined,
    };

    startTransition(async () => {
      await savePropertyAction(data);
      handleCloseModal();
      window.location.reload();
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseás archivar esta propiedad?')) return;
    startTransition(async () => {
      await deletePropertyAction(id);
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls: Search, Filters, New Property */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, calle o inquilino..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="DEPARTAMENTO">Departamento</option>
            <option value="CASA">Casa</option>
            <option value="LOCAL">Local</option>
            <option value="TERRENO">Terreno</option>
            <option value="OFICINA">Oficina</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">Todos los estados</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="ALQUILADO">Alquilado</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
          </select>

          {/* Sort Button */}
          <button
            type="button"
            onClick={() => setSortAsc(!sortAsc)}
            className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Código {sortAsc ? '↑' : '↓'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Propiedad</span>
        </button>
      </div>

      {/* Grid of Property Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((p) => {
          const isAlquilado = p.status === 'ALQUILADO';
          const hasDebt = (p.activeLease?.pendingDebtTotal || 0) > 0;

          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-extrabold text-lg text-slate-900">
                    {p.code}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isAlquilado
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isAlquilado ? 'Alquilado' : 'Disponible'}
                  </span>
                </div>

                <p className="text-xs font-semibold text-indigo-600 mt-1 uppercase tracking-wide">
                  {p.type}
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1 line-clamp-2">
                  {p.address}
                </p>

                {/* Features Pill */}
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  {p.rooms && <span>{p.rooms} amb.</span>}
                  {p.sqm && <span>{p.sqm} m²</span>}
                  {p.baseRent && (
                    <span className="font-mono font-semibold text-slate-800 ml-auto">
                      {formatCurrency(p.baseRent)}
                    </span>
                  )}
                </div>

                {/* Tenant / Current Lease Info */}
                {p.activeLease && (
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                    <p className="text-slate-500">
                      Inquilino:{' '}
                      <span className="font-semibold text-slate-800">
                        {p.activeLease.renterName}
                      </span>
                    </p>
                    <div className="flex items-center justify-between font-mono pt-1">
                      <span className="text-slate-600">
                        {formatCurrency(p.activeLease.currentRent)}/mes
                      </span>
                      {hasDebt && (
                        <span className="text-rose-600 font-bold">
                          Debe: {formatCurrency(p.activeLease.pendingDebtTotal)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href={`/propiedades/${p.id}`}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Ver Ficha</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(p)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-md hover:bg-slate-200/60"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                    title="Archivar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No se encontraron propiedades</h3>
          <p className="text-xs text-slate-500 mt-1">
            Intentá modificando los filtros de búsqueda o creá una nueva propiedad.
          </p>
        </div>
      )}

      {/* Modal Nueva / Editar Propiedad */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900">
              {editingProperty ? `Editar Propiedad ${editingProperty.code}` : 'Nueva Propiedad'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código Interno *
                  </label>
                  <input
                    name="code"
                    type="text"
                    required
                    defaultValue={editingProperty?.code || ''}
                    placeholder="Ej: 1, 2, DEPTO-01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Inmueble *
                  </label>
                  <select
                    name="type"
                    required
                    defaultValue={editingProperty?.type || 'DEPARTAMENTO'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="DEPARTAMENTO">Departamento</option>
                    <option value="CASA">Casa</option>
                    <option value="LOCAL">Local</option>
                    <option value="TERRENO">Terreno</option>
                    <option value="OFICINA">Oficina</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección Completa *
                </label>
                <input
                  name="address"
                  type="text"
                  required
                  defaultValue={editingProperty?.address || ''}
                  placeholder="Ej: Belgrano 1530 Dpto 1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ambientes
                  </label>
                  <input
                    name="rooms"
                    type="number"
                    min="1"
                    defaultValue={editingProperty?.rooms || ''}
                    placeholder="Ej: 2"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Superficie (m²)
                  </label>
                  <input
                    name="sqm"
                    type="number"
                    step="0.1"
                    defaultValue={editingProperty?.sqm || ''}
                    placeholder="Ej: 45"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    % Expensas
                  </label>
                  <input
                    name="expensesShare"
                    type="number"
                    step="0.01"
                    defaultValue={editingProperty?.expensesShare || ''}
                    placeholder="Ej: 15"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Precio Alquiler Base ($)
                </label>
                <input
                  name="baseRent"
                  type="number"
                  step="1000"
                  defaultValue={editingProperty?.baseRent || ''}
                  placeholder="Ej: 280000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas Internas
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingProperty?.notes || ''}
                  placeholder="Observaciones de la propiedad..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  {isPending ? 'Guardando...' : 'Guardar Propiedad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
