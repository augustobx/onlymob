'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Home, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { loginRenterAction } from '@/actions/auth-actions';

export default function RenterLoginPage() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await loginRenterAction(formData);
      if (!res.success) {
        setError(res.error || 'Error al iniciar sesión.');
      } else {
        window.location.href = '/portal';
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-2">
          <Home className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Portal Inquilino</h1>
        <p className="text-xs text-slate-500">
          Consultá tus contratos de locación, cuotas vigentes y recibos de pago
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-slate-200 py-8 px-6 shadow-xl rounded-2xl sm:px-10 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                DNI o Correo Electrónico
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  name="identifier"
                  type="text"
                  required
                  placeholder="Ej: 37925831 o tu correo"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Si no tenés clave, solicitala directamente a la inmobiliaria.
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all duration-150 flex items-center justify-center gap-2 mt-2"
            >
              <span>{isPending ? 'Ingresando...' : 'Ingresar al Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="text-xs text-slate-500 hover:text-indigo-600 font-medium"
            >
              Acceso exclusivo administradores →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
