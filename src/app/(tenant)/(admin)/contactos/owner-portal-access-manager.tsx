'use client';

import { useState, useTransition } from 'react';
import { KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { setOwnerPortalEnabledAction, setOwnerPortalPasswordAction } from '@/actions/owner-portal';

export function OwnerPortalAccessManager({ contacts }: { contacts: any[] }) {
  const owners = contacts.filter((contact) => contact.roles.includes('OWNER') && contact.ownedProperties.length > 0);
  const [selectedId, setSelectedId] = useState(owners[0]?.id || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const selected = owners.find((owner) => owner.id === selectedId);

  function run(task: () => Promise<any>, success: string) {
    setError('');
    setMessage('');
    startTransition(async () => {
      try {
        await task();
        setPassword('');
        setMessage(success);
        window.location.reload();
      } catch (err: any) {
        setError(err?.message || 'No se pudo completar la operación.');
      }
    });
  }

  if (!owners.length) return null;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-indigo-600" /><h2 className="font-bold text-slate-900">Acceso Portal Propietario</h2></div>
          <p className="text-xs text-slate-500 mt-1">Habilitá una clave individual para que cada propietario consulte únicamente su cartera.</p>
        </div>
        <a href="/propietario/login" target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600">Abrir portal →</a>
      </div>

      <div className="grid md:grid-cols-[1.4fr_1fr_auto] gap-3 mt-5 items-end">
        <label><span className="block text-xs font-semibold text-slate-700 mb-1">Propietario</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.companyName || `${owner.firstName} ${owner.lastName}`} · {owner.ownedProperties.length} inmueble(s)</option>)}</select></label>
        <label><span className="block text-xs font-semibold text-slate-700 mb-1">Nueva contraseña</span><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} placeholder="Mínimo 8 caracteres" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></label>
        <button disabled={isPending || !selectedId || password.length < 8} onClick={() => run(() => setOwnerPortalPasswordAction(selectedId, password, true), 'Acceso actualizado.')} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">Guardar y habilitar</button>
      </div>

      {selected && <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-2">{selected.ownerPortalEnabled ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldOff className="w-4 h-4 text-slate-400" />}<div><p className="text-xs font-bold">{selected.ownerPortalEnabled ? 'Portal habilitado' : 'Portal deshabilitado'}</p><p className="text-[11px] text-slate-500">{selected.hasOwnerPortalPassword ? 'Tiene contraseña configurada.' : 'Todavía no tiene contraseña.'}</p></div></div>{selected.hasOwnerPortalPassword && <button disabled={isPending} onClick={() => run(() => setOwnerPortalEnabledAction(selected.id, !selected.ownerPortalEnabled), selected.ownerPortalEnabled ? 'Acceso deshabilitado.' : 'Acceso habilitado.')} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold">{selected.ownerPortalEnabled ? 'Deshabilitar' : 'Habilitar'}</button>}</div>}
      {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}
      {message && <p className="text-xs text-emerald-600 mt-3">{message}</p>}
    </section>
  );
}
