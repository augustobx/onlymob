'use client';

import { useState, useTransition } from 'react';
import { Building2, ExternalLink, Globe, LogOut, Plus } from 'lucide-react';
import { createTenantAction, toggleTenantStatusAction } from '@/actions/superadmin';
import { logoutSuperAdminAction } from '@/actions/auth-actions';
import { formatDate } from '@/lib/utils';

interface TenantItem {
  id: string;
  slug: string;
  name: string;
  status: string;
  domains: string[];
  planName: string;
  planStatus: string;
  periodEnd: Date | null;
  createdAt: Date;
  stats: { properties: number; garages: number; propertyLeases: number; garageLeases: number; renters: number; users: number };
}

export function SuperAdminClient({ initialTenants }: { initialTenants: TenantItem[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleCreateTenant = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError('');

    startTransition(async () => {
      try {
        await createTenantAction({
          slug: String(formData.get('slug') || ''),
          name: String(formData.get('name') || ''),
          adminEmail: String(formData.get('adminEmail') || ''),
          adminName: String(formData.get('adminName') || ''),
          adminPassword: String(formData.get('adminPassword') || ''),
        });
        setIsModalOpen(false);
        window.location.reload();
      } catch (err: any) {
        setError(err?.message || 'No se pudo crear la inmobiliaria.');
      }
    });
  };

  const handleToggleStatus = (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`¿Confirmás cambiar el estado a ${nextStatus}?`)) return;
    startTransition(async () => {
      await toggleTenantStatusAction(tenantId, nextStatus as 'ACTIVE' | 'SUSPENDED');
      window.location.reload();
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2.5"><Building2 className="w-5 h-5 text-indigo-400" /> Inmobiliarias & Tenants ({initialTenants.length})</h2>
          <p className="text-xs text-slate-400 mt-1">Provisionamiento SaaS, dominios, planes y estado operativo</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setError(''); setIsModalOpen(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">
            <Plus className="w-4 h-4" /> Nueva Inmobiliaria
          </button>
          <form action={logoutSuperAdminAction}>
            <button type="submit" className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl" title="Cerrar sesión"><LogOut className="w-4 h-4" /></button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {initialTenants.map((tenant) => {
          const active = tenant.status === 'ACTIVE';
          return (
            <div key={tenant.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{tenant.name}</h3>
                  <p className="text-xs font-mono text-indigo-600 font-semibold mt-0.5">slug: {tenant.slug}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{active ? 'Activo' : 'Suspendido'}</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                {tenant.domains.map((domain) => <span key={domain} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono"><Globe className="w-3 h-3" />{domain}</span>)}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <Stat label="Propiedades" value={tenant.stats.properties} />
                <Stat label="Cocheras" value={tenant.stats.garages} />
                <Stat label="Inquilinos" value={tenant.stats.renters} />
              </div>

              <div className="text-xs text-slate-500 flex justify-between"><span>Plan: <strong className="text-slate-800">{tenant.planName}</strong></span><span>Alta: {formatDate(tenant.createdAt)}</span></div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button type="button" disabled={isPending} onClick={() => handleToggleStatus(tenant.id, tenant.status)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>{active ? 'Suspender Tenant' : 'Reactivar Tenant'}</button>
                {tenant.domains[0] && <a href={`https://${tenant.domains[0]}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">Abrir <ExternalLink className="w-3.5 h-3.5" /></a>}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-white">
            <h3 className="text-lg font-bold mb-1">Provisionar Nueva Inmobiliaria</h3>
            <p className="text-xs text-slate-400 mb-5">Se crea tenant, dominio, rol propietario, usuario administrador y suscripción en una única transacción.</p>
            {error && <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-900 text-xs text-rose-200">{error}</div>}
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <DarkField name="name" label="Nombre Comercial *" placeholder="Inmobiliaria Delta" required />
              <DarkField name="slug" label="Slug / Subdominio *" placeholder="delta" required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DarkField name="adminName" label="Administrador *" placeholder="Juan Pérez" required />
                <DarkField name="adminEmail" label="Email *" type="email" placeholder="juan@delta.com" required />
              </div>
              <DarkField name="adminPassword" label="Clave inicial segura *" type="password" placeholder="Mínimo 12 caracteres" minLength={12} required />
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">Cancelar</button>
                <button type="submit" disabled={isPending} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold">{isPending ? 'Provisionando...' : 'Confirmar y Provisionar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="p-2 bg-slate-50 rounded-lg"><span className="text-slate-400 block text-[10px] uppercase font-bold">{label}</span><span className="font-extrabold font-mono text-sm text-slate-900">{value}</span></div>;
}

function DarkField({ name, label, type = 'text', placeholder, required, minLength }: { name: string; label: string; type?: string; placeholder?: string; required?: boolean; minLength?: number }) {
  return <div><label className="block text-xs font-semibold text-slate-300 mb-1">{label}</label><input name={name} type={type} placeholder={placeholder} required={required} minLength={minLength} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40" /></div>;
}
