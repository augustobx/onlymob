'use client';

import { useState, useTransition } from 'react';
import {
  Users,
  Plus,
  Search,
  KeyRound,
  Edit,
  Phone,
  Mail,
  Home,
  Warehouse,
  CheckCircle2,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { saveRenterAction, setRenterPortalPasswordAction } from '@/actions/renters';

interface RenterItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dni: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status: string;
  hasPortalAccess: boolean;
  notes?: string | null;
  activePropertyLeases: Array<{
    id: string;
    propertyCode: string;
    rent: number;
  }>;
  activeGarageLeasesCount: number;
  totalPendingDebt: number;
}

export function RentersClient({ initialRenters }: { initialRenters: RenterItem[] }) {
  const [renters, setRenters] = useState(initialRenters);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();

  // Modals
  const [isRenterModalOpen, setIsRenterModalOpen] = useState(false);
  const [editingRenter, setEditingRenter] = useState<RenterItem | null>(null);

  const [portalModalRenter, setPortalModalRenter] = useState<RenterItem | null>(null);
  const [portalPassword, setPortalPassword] = useState('');
  const [portalSuccess, setPortalSuccess] = useState(false);

  const filtered = renters.filter((r) => {
    return (
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.dni.includes(search) ||
      (r.email || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleOpenRenterModal = (renter?: RenterItem) => {
    setEditingRenter(renter || null);
    setIsRenterModalOpen(true);
  };

  const handleSaveRenter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      id: editingRenter?.id,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      dni: formData.get('dni') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      status: formData.get('status') as any,
      notes: formData.get('notes') as string,
    };

    startTransition(async () => {
      await saveRenterAction(data);
      setIsRenterModalOpen(false);
      window.location.reload();
    });
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalModalRenter) return;

    startTransition(async () => {
      await setRenterPortalPasswordAction(portalModalRenter.id, portalPassword);
      setPortalSuccess(true);
      setTimeout(() => {
        setPortalSuccess(false);
        setPortalModalRenter(null);
        setPortalPassword('');
        window.location.reload();
      }, 1500);
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar inquilino por nombre o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <button
          type="button"
          onClick={() => handleOpenRenterModal()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Inquilino</span>
        </button>
      </div>

      {/* Renters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((r) => {
          const hasDebt = r.totalPendingDebt > 0;
          return (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      {r.fullName}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">DNI: {r.dni}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {r.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  {r.phone && (
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{r.phone}</span>
                    </div>
                  )}
                  {r.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{r.email}</span>
                    </div>
                  )}
                </div>

                {/* Leases & Debt Pill */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Inmuebles alquilados:</span>
                    <span className="font-bold text-slate-900">
                      {r.activePropertyLeases.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Cocheras:</span>
                    <span className="font-bold text-slate-900">
                      {r.activeGarageLeasesCount}
                    </span>
                  </div>
                  {hasDebt && (
                    <div className="p-2 bg-rose-50 rounded-lg text-rose-700 font-semibold font-mono flex justify-between items-center text-xs mt-2">
                      <span>Saldo adeudado:</span>
                      <span>{formatCurrency(r.totalPendingDebt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setPortalModalRenter(r);
                    setPortalPassword('');
                  }}
                  className={`inline-flex items-center gap-1 font-semibold ${
                    r.hasPortalAccess
                      ? 'text-slate-600 hover:text-indigo-600'
                      : 'text-indigo-600 hover:text-indigo-800'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{r.hasPortalAccess ? 'Clave Portal' : 'Activar Portal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenRenterModal(r)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100"
                  title="Editar Inquilino"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nuevo / Editar Inquilino */}
      {isRenterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900">
              {editingRenter ? 'Editar Inquilino' : 'Nuevo Inquilino'}
            </h3>

            <form onSubmit={handleSaveRenter} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    name="firstName"
                    type="text"
                    required
                    defaultValue={editingRenter?.firstName || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    name="lastName"
                    type="text"
                    required
                    defaultValue={editingRenter?.lastName || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  DNI / Documento *
                </label>
                <input
                  name="dni"
                  type="text"
                  required
                  defaultValue={editingRenter?.dni || ''}
                  placeholder="Ej: 37925831"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingRenter?.email || ''}
                  placeholder="inquilino@email.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  name="phone"
                  type="text"
                  defaultValue={editingRenter?.phone || ''}
                  placeholder="Ej: 3329684696"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estado
                </label>
                <select
                  name="status"
                  defaultValue={editingRenter?.status || 'ACTIVE'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRenterModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {isPending ? 'Guardando...' : 'Guardar Inquilino'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Clave de Portal PWA */}
      {portalModalRenter && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>Acceso al Portal Inquilino</span>
            </h3>

            <p className="text-xs text-slate-500">
              Generá una contraseña para que <span className="font-bold text-slate-800">{portalModalRenter.fullName}</span> ingrese a consultar sus contratos, deudas y recibos en el portal PWA.
            </p>

            {portalSuccess ? (
              <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>¡Contraseña configurada con éxito!</span>
              </div>
            ) : (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPortalModalRenter(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || portalPassword.length < 6}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    {isPending ? 'Guardando...' : 'Habilitar Clave'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
