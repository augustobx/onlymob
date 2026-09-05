'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, KeyRound, UserRound, AlertCircle } from 'lucide-react';
import { loginOwnerAction } from '@/actions/owner-portal';

export default function OwnerLoginPage() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await loginOwnerAction(formData);
      if (!result.success) setError(result.error || 'No se pudo iniciar sesión.');
      else window.location.href = '/propietario';
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-2">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Portal Propietario</h1>
        <p className="text-xs text-slate-500">Tus propiedades, cobros, gastos, liquidaciones y mantenimiento en un solo lugar.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-slate-200 py-8 px-6 shadow-xl rounded-2xl sm:px-10 space-y-6">
          {error && <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1.5">DNI, CUIT o correo electrónico</span><div className="relative"><UserRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" /><input name="identifier" required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div></label>
            <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1.5">Contraseña</span><div className="relative"><KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" /><input name="password" type="password" required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div><p className="text-[11px] text-slate-400 mt-1">La inmobiliaria habilita y administra tu acceso.</p></label>
            <button type="submit" disabled={isPending} className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"><span>{isPending ? 'Ingresando...' : 'Ingresar al Portal'}</span><ArrowRight className="w-4 h-4" /></button>
          </form>
          <div className="pt-4 border-t border-slate-100 text-center space-y-2"><Link href="/portal/login" className="block text-xs text-slate-500 hover:text-indigo-600 font-medium">¿Sos inquilino? Ir al Portal Inquilino →</Link><Link href="/login" className="block text-xs text-slate-400 hover:text-indigo-600">Acceso administradores →</Link></div>
        </div>
      </div>
    </div>
  );
}
