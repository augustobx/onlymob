'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  Building,
  CircleDollarSign,
  Edit,
  ExternalLink,
  KeyRound,
  Plus,
  Search,
  Trash2,
  UserRound,
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

  const summary = useMemo(() => ({
    rented: initialProperties.filter((p) => p.status === 'ALQUILADO').length,
    available: initialProperties.filter((p) => p.status !== 'ALQUILADO' && p.status !== 'MANTENIMIENTO').length,
    withDebt: initialProperties.filter((p) => (p.activeLease?.pendingDebtTotal || 0) > 0).length,
  }), [initialProperties]);

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

  const summaryCards = [
    { label: 'Total', value: initialProperties.length, icon: Building, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Alquiladas', value: summary.rented, icon: KeyRound, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Disponibles', value: summary.available, icon: Building, tone: 'text-sky-700 bg-sky-50' },
    { label: 'Con saldo', value: summary.withDebt, icon: CircleDollarSign, tone: summary.withDebt ? 'text-rose-700 bg-rose-50' : 'text-slate-600 bg-slate-100' },
  ];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs"><div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.tone}`}><Icon className="w-4 h-4" /></div><div><p className="text-[9px] uppercase tracking-[.1em] font-bold text-slate-400">{item.label}</p><p className="text-lg leading-none font-extrabold text-slate-900 mt-1">{item.value}</p></div></div>;
        })}
      </section>

      <section className="property-toolbar">
        <div className="property-toolbar__filters">
          <div className="property-search">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, dirección, localidad, inquilino o propietario..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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

          <button type="button" onClick={() => setSortAsc((value) => !value)} className="property-sort">
            <ArrowUpDown className="w-3.5 h-3.5" /> Código {sortAsc ? '↑' : '↓'}
          </button>
        </div>

        <button type="button" onClick={() => openModal()} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> Nueva propiedad
        </button>
      </section>

      {error && !isModalOpen && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl">{error}</div>
      )}

      <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-[10px] text-slate-500"><strong className="text-slate-800">{filtered.length}</strong> propiedades en esta vista</p>
        <p className="text-[9px] uppercase tracking-[.12em] font-bold text-slate-400">Ficha 360 disponible en cada inmueble</p>
      </div>

      <section className="property-grid">
        {filtered.map((property) => {
          const hasDebt = (property.activeLease?.pendingDebtTotal || 0) > 0;
          const mainPrice = property.operation === 'SALE' ? property.salePrice : property.rentPrice ?? property.baseRent;
          const ownerName = property.owners?.find((owner) => owner.isPrimary)?.name || property.owners?.[0]?.name;
          const statusClass = property.status === 'ALQUILADO'
            ? 'property-status--rented'
            : property.status === 'MANTENIMIENTO'
              ? 'property-status--maintenance'
              : 'property-status--available';
          const statusLabel = property.status === 'ALQUILADO'
            ? 'Alquilada'
            : property.status === 'MANTENIMIENTO'
              ? 'Mantenimiento'
              : COMMERCIAL_LABELS[property.commercialStatus] || 'Disponible';

          return (
            <article key={property.id} className="property-card">
              <div className="property-card__body">
                <div className="property-card__top">
                  <div>
                    <div className="property-code"><span>{property.code}</span><span className="!bg-transparent !p-0 !min-w-0 !font-sans !h-auto">Inmueble</span></div>
                    <p className="property-operation">{OPERATION_LABELS[property.operation] || property.operation}</p>
                  </div>
                  <span className={`property-status ${statusClass}`}>{statusLabel}</span>
                </div>

                <p className="property-type">{property.type}</p>
                <h3 className="property-address">{property.address}</h3>
                {(property.city || property.province) && <p className="property-location">{[property.city, property.province].filter(Boolean).join(' · ')}</p>}

                {(property.rooms != null || property.bedrooms != null || property.bathrooms != null || property.sqm != null) && (
                  <div className="property-features">
                    {property.rooms != null && <span className="property-feature">{property.rooms} amb.</span>}
                    {property.bedrooms != null && <span className="property-feature">{property.bedrooms} dorm.</span>}
                    {property.bathrooms != null && <span className="property-feature">{property.bathrooms} baño/s</span>}
                    {property.sqm != null && <span className="property-feature">{property.sqm} m²</span>}
                  </div>
                )}

                {mainPrice != null && (
                  <div className="property-finance">
                    <div><small>{property.operation === 'SALE' ? 'Precio de venta' : 'Valor mensual'}</small><strong>{money(mainPrice, property.currency)}</strong></div>
                    {property.expenses != null && <div className="text-right"><small>Expensas</small><strong className="!text-[10px] !font-semibold">{money(property.expenses, property.currency)}</strong></div>}
                  </div>
                )}

                {ownerName && (
                  <div className="property-person">
                    <div className="flex items-center gap-2"><UserRound className="w-3.5 h-3.5 text-indigo-500" /><span className="property-person__label">Propietario</span></div>
                    <p className="property-person__name">{ownerName}</p>
                  </div>
                )}

                {property.activeLease && (
                  <div className="property-person">
                    <div className="flex items-center gap-2"><KeyRound className="w-3.5 h-3.5 text-emerald-600" /><span className="property-person__label">Ocupación actual</span></div>
                    <p className="property-person__name">{property.activeLease.renterName}</p>
                    <div className="property-person__meta">
                      <span>{formatCurrency(property.activeLease.currentRent)}/mes</span>
                      {hasDebt && <span className="property-person__debt">Saldo {formatCurrency(property.activeLease.pendingDebtTotal)}</span>}
                    </div>
                  </div>
                )}
              </div>

              <footer className="property-card__footer">
                <Link href={`/propiedades/${property.id}`} className="property-card__link">
                  Abrir propiedad 360 <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => openModal(property)} className="icon-action" title="Editar propiedad"><Edit className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => handleDelete(property.id)} className="icon-action hover:!text-rose-600 hover:!border-rose-200 hover:!bg-rose-50" title="Archivar propiedad"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </footer>
            </article>
          );
        })}
      </section>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center shadow-xs">
          <Building className="w-11 h-11 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No se encontraron propiedades</h3>
          <p className="text-xs text-slate-500 mt-1">Modificá los filtros o creá una nueva propiedad.</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 my-6 border border-white/30">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-indigo-500">Propiedad</p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{editingProperty ? `Editar ${editingProperty.code} · ${editingProperty.address}` : 'Nueva propiedad'}</h3>
              <p className="text-xs text-slate-500 mt-1">Datos comerciales y administrativos principales del inmueble.</p>
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
                  <label className="form-label">Notas internas</label>
                  <textarea name="notes" rows={3} defaultValue={editingProperty?.notes || ''} className="form-input" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isPending} className="btn-primary">{isPending ? 'Guardando...' : 'Guardar propiedad'}</button>
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
    <select value={value} onChange={(event) => onChange(event.target.value)} className="property-filter">
      {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
    </select>
  );
}

function SelectField({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: Array<[string, string]> }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <select name={name} defaultValue={defaultValue} className="form-input">
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </div>
  );
}

function Field({ name, label, defaultValue, type = 'text', required, min, max, step }: { name: string; label: string; defaultValue: string | number; type?: string; required?: boolean; min?: string; max?: string; step?: string }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input name={name} type={type} required={required} min={min} max={max} step={step} defaultValue={defaultValue} className="form-input" />
    </div>
  );
}
