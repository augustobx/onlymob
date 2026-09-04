'use client';

import { useState, useTransition } from 'react';
import {
  Building2,
  Plus,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Globe,
  Users,
  Home,
  LogOut,
} from 'lucide-react';
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
  stats: {
    properties: number;
    garages: number;
    propertyLeases: number;
    garageLeases: number;
    renters: number;
    users: number;
  };
}

export function SuperAdminClient({ initialTenants }: { initialTenants: TenantItem[] }) {
  const [tenants, setTenants] = useState(initialTenants);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCreateTenant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      slug: formData.get('slug') as string,
      name: formData.get('name') as string,
      adminEmail: formData.get('adminEmail') as string,
      adminName: formData.get('adminName') as string,
      adminPassword: formData.get('adminPassword') as string,
    };

    startTransition(async () => {
      await createTenantAction(data);
      setIsModalOpen(false);
      window.location.reload();
    });
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`¿Confirmás cambiar el estado a ${nextStatus}?`)) return;

    startTransition(async () => {
      await toggleTenantStatusAction(tenantId, nextStatus as any);
      window.location.reload();
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Inmobiliarias & Tenants ({tenants.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Provisionamiento de instancias SaaS, dominios y estado de suscripción
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Inmobiliaria</span>
          </button>

          <form action={logoutSuperAdminAction}>
            <button
              type="submit"
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
              title="Cerrar Sesión SuperAdmin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Tenants Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tenants.map((t) => {
          const isActive = t.status === 'ACTIVE';
          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{t.name}</h3>
                    <p className="text-xs font-mono text-indigo-600 font-semibold mt-0.5">
                      slug: {t.slug}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isActive ? 'Activo' : 'Suspendido'}
                  </span>
                </div>

                {/* Domains */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                  {t.domains.map((dom) => (
                    <span
                      key={dom}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono"
                    >
                      <Globe className="w-3 h-3 text-slate-400" />
                      <span>{dom}</span>
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-center">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Propiedades
                    </span>
                    <span className="font-extrabold font-mono text-sm text-slate-900">
                      {t.stats.properties}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Cocheras
                    </span>
                    <span className="font-extrabold font-mono text-sm text-slate-900">
                      {t.stats.garages}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Inquilinos
                    </span>
                    <span className="font-extrabold font-mono text-sm text-slate-900">
                      {t.stats.renters}
                    </span>
                  </div>
                </div>

                {/* Plan Info */}
                <div className="mt-3 text-xs text-slate-500 flex justify-between items-center">
                  <span>Plan: <strong className="text-slate-800">{t.planName}</strong></span>
                  <span>Alta: {formatDate(t.createdAt)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(t.id, t.status)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  {isActive ? 'Suspender Tenant' : 'Reactivar Tenant'}
                </button>

                <a
                  href={`http://${t.domains[0] || 'localhost:3000'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <span>Abrir Instancia</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nueva Inmobiliaria */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-white animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white">Provisionar Nueva Inmobiliaria</h3>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Comercial *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Ej: Inmobiliaria Delta"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Slug / Subdominio *
                </label>
                <input
                  name="slug"
                  type="text"
                  required
                  placeholder="ej: delta (delta.nanoapps.ar)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Administrador *
                  </label>
                  <input
                    name="adminName"
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Administrador *
                  </label>
                  <input
                    name="adminEmail"
                    type="email"
                    required
                    placeholder="juan@delta.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Clave Temporal del Administrador
                </label>
                <input
                  name="adminPassword"
                  type="password"
                  defaultValue="Admin2026!"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {isPending ? 'Provisionando...' : 'Confirmar y Provisionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
