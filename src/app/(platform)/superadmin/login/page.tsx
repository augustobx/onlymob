'use client';

import { useState, useTransition } from 'react';
import { AlertCircle, ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';
import { loginSuperAdminAction } from '@/actions/auth-actions';

export default function SuperAdminLoginPage() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginSuperAdminAction(formData);
      if (!res.success) setError(res.error || 'Error al ingresar.');
      else window.location.href = '/superadmin';
    });
  };

  return <div className="flex min-h-screen flex-col justify-center bg-slate-950 px-4 py-12 selection:bg-indigo-500 selection:text-white sm:px-6 lg:px-8">
    <div className="text-center sm:mx-auto sm:w-full sm:max-w-md"><div className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30"><ShieldCheck className="h-8 w-8" /></div><h1 className="text-2xl font-black tracking-tight text-white">NanoLabs Plataforma</h1><p className="mt-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">Plano de Control SuperAdmin · OnlyMob</p></div>
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"><div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-8 shadow-2xl sm:px-10">
      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
      <form onSubmit={handleSubmit} className="space-y-4"><label className="block text-xs font-semibold text-slate-300">Correo de plataforma<div className="relative mt-1.5"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input name="email" type="email" required autoComplete="email" placeholder="superadmin@nanolabs.com.ar" className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40" /></div></label><label className="block text-xs font-semibold text-slate-300">Clave maestra<div className="relative mt-1.5"><Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input name="password" type="password" required autoComplete="current-password" placeholder="••••••••••••" className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40" /></div></label><button type="submit" disabled={isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"><span>{isPending ? 'Verificando...' : 'Acceder al plano maestro'}</span><ArrowRight className="h-4 w-4" /></button></form>
    </div></div>
  </div>;
}
