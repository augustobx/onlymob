'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  Building,
  Edit,
  ExternalLink,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { deletePropertyAction, savePropertyAction } from '@/actions/properties';

interface PropertyItem {
  id: string;
  code: string;
  address: string;
  type: string;
  operation: string;
  commercialStatus: string;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqm: number | null;
  baseRent: number | null;
  rentPrice: number | null;
  salePrice: number | null;
  expenses: number | null;
  expensesShare: number | null;
  currency: string;
  city: string | null;
  province: string | null;
  status: string;
  notes?: string | null;
  owners?: Array<{
    id: string;
    contactId: string;
    name: string;
    percentage: number;
    isPrimary: boolean;
  }>;
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

const OPERATION_LABELS: Record<string, string> = {
  RENT: 'Alquiler',
  SALE: 'Venta',
  TEMPORARY_RENT: 'Alquiler temporal',
  MANAGEMENT: 'Administración',
};

const COMMERCIAL_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservada',
  UNDER_NEGOTIATION: 'En negociación',
  CLOSED: 'Cerrada',
  PAUSED: 'Pausada',
  ARCHIVED: 'Archivada',
};

function money(value: number | null | undefined, currency = 'ARS') {
  if (value == null) return null;
  return `${currency} ${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

export function PropertyTable({ initialProperties }: { initialProperties: PropertyItem[] }) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedOperation, setSelectedOperation] = useState('ALL');
  const [sortAsc, setSortAsc] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialProperties
      .filter((property) => {
        const matchesSearch = !q || [
          property.code,
          property.address,
          property.city,
          property.province,
          property.activeLease?.renterName,
          property.owners?.map((owner) => owner.name).join(' '),
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
        const matchesType = selectedType === 'ALL' || property.type === selectedType;
        const matchesStatus = selectedStatus === 'ALL' || property.status === selectedStatus;
        const matchesOperation = selectedOperation === 'ALL' || property.operation === selectedOperation;
        return matchesSearch && matchesType && matchesStatus && matchesOperation;
      })
      .sort((a, b) => {
        const numericA = Number(a.code);
        const numericB = Number(b.code);
        if (Number.isFinite(numericA) && Number.isFinite(numericB)) {
          return sortAsc ? numericA - numericB : numericB - numericA;
        }
        return sortAsc ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
      });
  }, [initialProperties, search, selectedType, selectedStatus, selectedOperation, sortAsc]);

  function openModal(property?: PropertyItem) {
    setEditingProperty(property || null);
    setError('');
    setIsModalOpen(true);
  }

  function closeModal() {
    setEditingProperty(null);
    setError('');
    setIsModalOpen(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const operation = String(formData.get('operation') || 'RENT');
    const rentPrice = formData.get('rentPrice') ? Number(formData.get('rentPrice')) : null;

    startTransition(async () => {
      try {
        setError('');
        await savePropertyAction({
          id: editingProperty?.id,
          code: String(formData.get('code') || ''),
          address: String(formData.get('address') || ''),
          type: String(formData.get('type') || 'DEPARTAMENTO') as any,
          operation: operation as any,
          commercialStatus: String(formData.get('commercialStatus') || 'AVAILABLE') as any,
          rooms: formData.get('rooms') ? Number(formData.get('rooms')) : null,
          bedrooms: formData.get('bedrooms') ? Number(formData.get('bedrooms')) : null,
          bathrooms: formData.get('bathrooms') ? Number(formData.get('bathrooms')) : null,
          sqm: formData.get('sqm') ? Number(formData.get('sqm')) : null,
          baseRent: operation === 'RENT' || operation === 'TEMPORARY_RENT' || operation === 'MANAGEMENT' ? rentPrice : null,
          rentPrice,
          salePrice: formData.get('salePrice') ? Number(formData.get('salePrice')) : null,
          expenses: formData.get('expenses') ? Number(formData.get('expenses')) : null,
          expensesShare: formData.get('expensesShare') ? Number(formData.get('expensesShare')) : null,
          currency: String(formData.get('currency') || 'ARS'),
          city: String(formData.get('city') || '') || null,
          province: String(formData.get('province') || '') || null,
          notes: String(formData.get('notes') || '') || undefined,
        });
        closeModal();
        window.location.reload();
      } catch (err: any) {
        setError(err?.message || 'No se pudo guardar la propiedad.');
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm('¿Seguro que deseás archivar esta propiedad?')) return;
    startTransition(async () => {
      try {
        setError('');
        await deletePropertyAction(id);
        window.location.reload();
      } catch (err: any) {
        setError(err?.message || 'No se pudo archivar la propiedad.');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[230px] sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Código, dirección, localidad, inquilino o propietario..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <FilterSelect value={selectedOperation} onChange={setSelectedOperation} options={[
            ['ALL', 'Todas las operaciones'], ['RENT', 'Alquiler'], ['SALE', 'Venta'], ['TEMPORARY_RENT', 'Temporal'], ['MANAGEMENT', 'Administración'],
          ]} />
          <FilterSelect value={selectedType} onChange={setSelectedType} options={[
            ['ALL', 'Todos los tipos'], ['DEPARTAMENTO', 'Departamento'], ['CASA', 'Casa'], ['LOCAL', 'Local'], ['TERRENO', 'Terreno'], ['OFICINA', 'Oficina'], ['COCHERA', 'Cochera'], ['OTRO', 'Otro'],
          ]} />
          <FilterSelect value={selectedStatus} onChange={setSelectedStatus} options={[
            ['ALL', 'Todos los estados'], ['DISPONIBLE', 'Disponible'], ['ALQUILADO', 'Alquilado'], ['MANTENIMIENTO', 'Mantenimiento'],
          ]} />

          <button type="button" onClick={() => setSortAsc((value) => !value)} className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
            <ArrowUpDown className="w-3.5 h-3.5" /> Código {sortAsc ? '↑' : '↓'}
          </button>
        </div>

        <button type="button" onClick={() => openModal()} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs">
          <Plus className="w-4 h-4" /> Nueva Propiedad
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((property) => {
          const hasDebt = (property.activeLease?.pendingDebtTotal || 0) > 0;
          const mainPrice = property.operation === 'SALE' ? property.salePrice : property.rentPrice ?? property.baseRent;

          return (
            <div key={property.id} className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-extrabold text-lg text-slate-900">{property.code}</span>
                    <p className="text-[10px] uppercase tracking-wide font-bold text-indigo-600 mt-0.5">{OPERATION_LABELS[property.operation] || property.operation}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${property.status === 'ALQUILADO' ? 'bg-amber-100 text-amber-800' : property.status === 'MANTENIMIENTO' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {property.status === 'ALQUILADO' ? 'Alquilado' : property.status === 'MANTENIMIENTO' ? 'Mantenimiento' : COMMERCIAL_LABELS[property.commercialStatus] || 'Disponible'}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-500 mt-2 uppercase">{property.type}</p>
                <p className="text-sm font-medium text-slate-700 mt-1 line-clamp-2">{property.address}</p>
                {(property.city || property.province) && <p className="text-[11px] text-slate-400 mt-1">{[property.city, property.province].filter(Boolean).join(', ')}</p>}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  {property.rooms != null && <span>{property.rooms} amb.</span>}
                  {property.bedrooms != null && <span>{property.bedrooms} dorm.</span>}
                  {property.bathrooms != null && <span>{property.bathrooms} baño/s</span>}
                  {property.sqm != null && <span>{property.sqm} m²</span>}
                </div>

                {mainPrice != null && (
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Precio</span>
                    <span className="font-mono font-extrabold text-sm text-slate-900">{money(mainPrice, property.currency)}</span>
                  </div>
                )}

                {property.owners && property.owners.length > 0 && (
                  <div className="mt-3 p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs">
                    <span className="text-indigo-500 text-[10px] uppercase font-bold">Propietario</span>
                    <p className="font-semibold text-indigo-900 truncate">{property.owners.find((owner) => owner.isPrimary)?.name || property.owners[0].name}</p>
                  </div>
                )}

                {property.activeLease && (
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                    <p className="text-slate-500">Inquilino: <span className="font-semibold text-slate-800">{property.activeLease.renterName}</span></p>
                    <div className="flex items-center justify-between font-mono pt-1 gap-2">
                      <span className="text-slate-600">{formatCurrency(property.activeLease.currentRent)}/mes</span>
                      {hasDebt && <span className="text-rose-600 font-bold">Debe: {formatCurrency(property.activeLease.pendingDebtTotal)}</span>}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link href={`/propiedades/${property.id}`} className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  Ver Ficha <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => openModal(property)} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-md hover:bg-slate-200/60" title="Editar"><Edit className="w-4 h-4" /></button>
                  <button type="button" onClick={() => handleDelete(property.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50" title="Archivar"><Trash2 className="w-4 h-4" /></button>
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
          <p className="text-xs text-slate-500 mt-1">Modificá los filtros o creá una nueva propiedad.</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-5 my-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{editingProperty ? `Editar Propiedad ${editingProperty.code}` : 'Nueva Propiedad'}</h3>
              <p className="text-xs text-slate-500 mt-1">Ficha comercial y administrativa principal del inmueble.</p>
            </div>

            {error && <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-lg">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Field name="code" label="Código interno *" required defaultValue={editingProperty?.code || ''} />
                <SelectField name="type" label="Tipo *" defaultValue={editingProperty?.type || 'DEPARTAMENTO'} options={[
                  ['DEPARTAMENTO','Departamento'],['CASA','Casa'],['LOCAL','Local'],['TERRENO','Terreno'],['OFICINA','Oficina'],['COCHERA','Cochera'],['OTRO','Otro'],
                ]} />
                <SelectField name="operation" label="Operación *" defaultValue={editingProperty?.operation || 'RENT'} options={[
                  ['RENT','Alquiler'],['SALE','Venta'],['TEMPORARY_RENT','Alquiler temporal'],['MANAGEMENT','Administración'],
                ]} />
                <SelectField name="commercialStatus" label="Estado comercial" defaultValue={editingProperty?.commercialStatus || 'AVAILABLE'} options={[
                  ['DRAFT','Borrador'],['AVAILABLE','Disponible'],['RESERVED','Reservada'],['UNDER_NEGOTIATION','En negociación'],['CLOSED','Cerrada'],['PAUSED','Pausada'],
                ]} />
              </section>

              <section className="space-y-4">
                <Field name="address" label="Dirección completa *" required defaultValue={editingProperty?.address || ''} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field name="city" label="Localidad" defaultValue={editingProperty?.city || ''} />
                  <Field name="province" label="Provincia" defaultValue={editingProperty?.province || ''} />
                </div>
              </section>

              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field name="rooms" label="Ambientes" type="number" min="0" defaultValue={editingProperty?.rooms ?? ''} />
                <Field name="bedrooms" label="Dormitorios" type="number" min="0" defaultValue={editingProperty?.bedrooms ?? ''} />
                <Field name="bathrooms" label="Baños" type="number" min="0" defaultValue={editingProperty?.bathrooms ?? ''} />
                <Field name="sqm" label="Superficie total m²" type="number" min="0" step="0.01" defaultValue={editingProperty?.sqm ?? ''} />
              </section>

              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SelectField name="currency" label="Moneda" defaultValue={editingProperty?.currency || 'ARS'} options={[["ARS","ARS"],["USD","USD"],["EUR","EUR"]]} />
                <Field name="rentPrice" label="Precio alquiler" type="number" min="0" step="0.01" defaultValue={editingProperty?.rentPrice ?? editingProperty?.baseRent ?? ''} />
                <Field name="salePrice" label="Precio venta" type="number" min="0" step="0.01" defaultValue={editingProperty?.salePrice ?? ''} />
                <Field name="expenses" label="Expensas" type="number" min="0" step="0.01" defaultValue={editingProperty?.expenses ?? ''} />
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field name="expensesShare" label="% expensas a cargo" type="number" min="0" max="100" step="0.01" defaultValue={editingProperty?.expensesShare ?? ''} />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notas internas</label>
                  <textarea name="notes" rows={3} defaultValue={editingProperty?.notes || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">Cancelar</button>
                <button type="submit" disabled={isPending} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs">{isPending ? 'Guardando...' : 'Guardar Propiedad'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
      {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
    </select>
  );
}

function SelectField({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: Array<[string, string]> }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <select name={name} defaultValue={defaultValue} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </div>
  );
}

function Field({ name, label, defaultValue, type = 'text', required, min, max, step }: { name: string; label: string; defaultValue: string | number; type?: string; required?: boolean; min?: string; max?: string; step?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input name={name} type={type} required={required} min={min} max={max} step={step} defaultValue={defaultValue} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
    </div>
  );
}
