'use client';

import { useMemo, useState, useTransition } from 'react';
import { archiveContactAction, saveContactAction } from '@/actions/contacts';
import { Building2, Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react';

const ROLE_OPTIONS = [
  ['OWNER', 'Propietario'],
  ['PROSPECT', 'Prospecto'],
  ['BUYER', 'Comprador'],
  ['RENTAL_PROSPECT', 'Interesado alquiler'],
  ['RENTER', 'Inquilino'],
  ['GUARANTOR', 'Garante'],
  ['PROVIDER', 'Proveedor'],
  ['GENERAL', 'General'],
] as const;

type ContactRow = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  cuit: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  bankAlias: string | null;
  bankCbu: string | null;
  notes: string | null;
  roles: string[];
  ownedProperties: Array<{
    id: string;
    propertyId: string;
    propertyCode: string;
    propertyAddress: string;
    percentage: number;
    isPrimary: boolean;
  }>;
};

const emptyForm = {
  id: '', firstName: '', lastName: '', companyName: '', documentType: 'DNI', documentNumber: '', cuit: '',
  email: '', phone: '', alternatePhone: '', address: '', city: '', province: '', postalCode: '', bankAlias: '', bankCbu: '', notes: '',
  roles: ['GENERAL'] as string[],
};

export function ContactsClient({ initialContacts }: { initialContacts: ContactRow[] }) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const contacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialContacts;
    return initialContacts.filter((contact) =>
      [contact.firstName, contact.lastName, contact.companyName, contact.documentNumber, contact.email, contact.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [initialContacts, search]);

  function edit(contact: ContactRow) {
    setForm({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      companyName: contact.companyName || '',
      documentType: contact.documentType || 'DNI',
      documentNumber: contact.documentNumber || '',
      cuit: contact.cuit || '',
      email: contact.email || '',
      phone: contact.phone || '',
      alternatePhone: contact.alternatePhone || '',
      address: contact.address || '',
      city: contact.city || '',
      province: contact.province || '',
      postalCode: contact.postalCode || '',
      bankAlias: contact.bankAlias || '',
      bankCbu: contact.bankCbu || '',
      notes: contact.notes || '',
      roles: contact.roles.length ? contact.roles : ['GENERAL'],
    });
    setError('');
    setShowForm(true);
  }

  function toggleRole(role: string) {
    setForm((current) => ({
      ...current,
      roles: current.roles.includes(role)
        ? current.roles.filter((item) => item !== role).length
          ? current.roles.filter((item) => item !== role)
          : ['GENERAL']
        : [...current.roles.filter((item) => item !== 'GENERAL'), role],
    }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        await saveContactAction({
          ...(form.id ? { id: form.id } : {}),
          firstName: form.firstName,
          lastName: form.lastName,
          companyName: form.companyName,
          documentType: form.documentType,
          documentNumber: form.documentNumber,
          cuit: form.cuit,
          email: form.email,
          phone: form.phone,
          alternatePhone: form.alternatePhone,
          address: form.address,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
          bankAlias: form.bankAlias,
          bankCbu: form.bankCbu,
          notes: form.notes,
          roles: form.roles as any,
        });
        setShowForm(false);
        setForm(emptyForm);
      } catch (err: any) {
        setError(err?.message || 'No se pudo guardar el contacto.');
      }
    });
  }

  function archive(id: string) {
    if (!confirm('¿Archivar este contacto?')) return;
    startTransition(async () => {
      try {
        await archiveContactAction(id);
      } catch (err: any) {
        setError(err?.message || 'No se pudo archivar el contacto.');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre, DNI, email o teléfono..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
        </div>
        <button onClick={() => { setForm(emptyForm); setError(''); setShowForm(true); }} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">
          <Plus className="w-4 h-4" /> Nuevo contacto
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-sm text-rose-700">{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">{form.id ? 'Editar contacto' : 'Nuevo contacto'}</h2>
              <p className="text-xs text-slate-500">Una misma persona puede cumplir varios roles dentro de la inmobiliaria.</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-slate-500 hover:text-slate-900">Cancelar</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre *" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} required />
            <Field label="Apellido *" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} required />
            <Field label="Empresa / Razón social" value={form.companyName} onChange={(value) => setForm({ ...form, companyName: value })} />
            <Field label="Documento" value={form.documentNumber} onChange={(value) => setForm({ ...form, documentNumber: value })} />
            <Field label="CUIT" value={form.cuit} onChange={(value) => setForm({ ...form, cuit: value })} />
            <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            <Field label="Teléfono" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
            <Field label="Teléfono alternativo" value={form.alternatePhone} onChange={(value) => setForm({ ...form, alternatePhone: value })} />
            <Field label="Dirección" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
            <Field label="Localidad" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
            <Field label="Provincia" value={form.province} onChange={(value) => setForm({ ...form, province: value })} />
            <Field label="Alias bancario" value={form.bankAlias} onChange={(value) => setForm({ ...form, bankAlias: value })} />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">Roles</span>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map(([value, label]) => (
                <button key={value} type="button" onClick={() => toggleRole(value)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${form.roles.includes(value) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notas internas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>

          <div className="flex justify-end">
            <button disabled={isPending} type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
              {isPending ? 'Guardando...' : 'Guardar contacto'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {contacts.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No hay contactos para mostrar.</div>
          ) : contacts.map((contact) => (
            <div key={contact.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                  {contact.companyName ? <Building2 className="w-5 h-5" /> : <UserRound className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{contact.firstName} {contact.lastName}</span>
                    {contact.roles.map((role) => <span key={role} className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-semibold text-slate-600">{ROLE_OPTIONS.find(([value]) => value === role)?.[1] || role}</span>)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{[contact.companyName, contact.documentNumber && `Doc. ${contact.documentNumber}`, contact.phone, contact.email].filter(Boolean).join(' · ') || 'Sin datos adicionales'}</p>
                  {contact.ownedProperties.length > 0 && <p className="text-[11px] text-indigo-600 mt-1 font-medium">{contact.ownedProperties.length} propiedad/es asociada/s</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 self-end lg:self-auto">
                <button onClick={() => edit(contact)} className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50" title="Editar"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => archive(contact.id)} className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50" title="Archivar"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
    </div>
  );
}
