'use client';

import { useMemo, useState, useTransition } from 'react';
import { Building2, Link2, Trash2 } from 'lucide-react';
import { assignPropertyOwnerAction, removePropertyOwnerAction } from '@/actions/contacts';

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

type PropertyOption = {
  id: string;
  code: string;
  address: string;
  owners: Array<{
    id: string;
    contactId: string;
    name: string;
    percentage: number;
    isPrimary: boolean;
  }>;
};

export function OwnershipManager({ contacts, properties }: { contacts: ContactOption[]; properties: PropertyOption[] }) {
  const ownerContacts = useMemo(() => contacts.filter((contact) => contact.roles.includes('OWNER')), [contacts]);
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [contactId, setContactId] = useState(ownerContacts[0]?.id || '');
  const [percentage, setPercentage] = useState('100');
  const [isPrimary, setIsPrimary] = useState(true);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const relations = properties.flatMap((property) =>
    property.owners.map((owner) => ({ ...owner, propertyId: property.id, propertyCode: property.code, propertyAddress: property.address }))
  );

  function assign(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        await assignPropertyOwnerAction({
          propertyId,
          contactId,
          ownershipPercentage: Number(percentage),
          isPrimary,
        });
        window.location.reload();
      } catch (err: any) {
        setError(err?.message || 'No se pudo vincular el propietario.');
      }
    });
  }

  function remove(ownerId: string) {
    if (!confirm('¿Eliminar esta relación de titularidad?')) return;
    setError('');
    startTransition(async () => {
      try {
        await removePropertyOwnerAction(ownerId);
        window.location.reload();
      } catch (err: any) {
        setError(err?.message || 'No se pudo quitar la relación.');
      }
    });
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Link2 className="w-5 h-5" /></div>
        <div>
          <h2 className="font-bold text-slate-900">Titularidad de propiedades</h2>
          <p className="text-xs text-slate-500 mt-0.5">Relacioná uno o varios propietarios con cada inmueble y definí su porcentaje.</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {ownerContacts.length === 0 || properties.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500">
            {properties.length === 0 ? 'Primero cargá una propiedad.' : 'Primero creá un contacto con rol Propietario.'}
          </div>
        ) : (
          <form onSubmit={assign} className="grid grid-cols-1 lg:grid-cols-[1.4fr_1.4fr_140px_auto_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Propiedad</label>
              <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm">
                {properties.map((property) => <option key={property.id} value={property.id}>{property.code} · {property.address}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Propietario</label>
              <select value={contactId} onChange={(event) => setContactId(event.target.value)} className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm">
                {ownerContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Titularidad %</label>
              <input value={percentage} onChange={(event) => setPercentage(event.target.value)} type="number" min="0.01" max="100" step="0.01" required className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm" />
            </div>
            <label className="flex items-center gap-2 px-3 py-2 h-10 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} /> Principal
            </label>
            <button disabled={isPending} type="submit" className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold">{isPending ? 'Vinculando...' : 'Vincular'}</button>
          </form>
        )}

        {error && <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700">{error}</div>}

        {relations.length > 0 && (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {relations.map((relation) => (
              <div key={relation.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
                <div className="flex items-start gap-3 min-w-0">
                  <Building2 className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">{relation.propertyCode} · {relation.propertyAddress}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{relation.name} · {relation.percentage}% {relation.isPrimary ? '· Principal' : ''}</p>
                  </div>
                </div>
                <button type="button" onClick={() => remove(relation.id)} disabled={isPending} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg self-end sm:self-auto" title="Quitar propietario"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
