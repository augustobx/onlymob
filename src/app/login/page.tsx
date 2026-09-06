'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Building2, Lock, Mail } from 'lucide-react';
import { loginAdminAction } from '@/actions/auth-actions';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginAdminAction(formData);
      if (!res.success) {
        if (res.error === 'TENANT_SUSPENDED') { window.location.href = '/suspendido'; return; }
        setError(res.error || 'Error al iniciar sesión.');
      } else window.location.href = '/dashboard';
    });
  };

  return <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-slate-950 px-4 py-12 selection:bg-indigo-500 selection:text-white sm:px-6 lg:px-8">
    <div className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/15 blur-3xl" />
    <div className="relative z-10 text-center sm:mx-auto sm:w-full sm:max-w-md"><div className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30"><Building2 className="h-8 w-8" /></div><h1 className="text-2xl font-black tracking-tight text-white">OnlyMob Inmobiliaria</h1><p className="mt-2 text-xs text-slate-400">Ingresá con tu cuenta administrativa para gestionar la inmobiliaria</p></div>
    <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md"><div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-8 shadow-2xl sm:px-10">
      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
      <form onSubmit={handleSubmit} className="space-y-4"><label className="block text-xs font-semibold text-slate-300">Correo electrónico<div className="relative mt-1.5"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input name="email" type="email" required autoComplete="email" placeholder="admin@inmobiliaria.com" className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40" /></div></label><label className="block text-xs font-semibold text-slate-300">Contraseña<div className="relative mt-1.5"><Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40" /></div></label><button type="submit" disabled={isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"><span>{isPending ? 'Ingresando...' : 'Iniciar sesión'}</span><ArrowRight className="h-4 w-4" /></button></form>
      <div className="border-t border-slate-800/80 pt-4 text-center"><Link href="/portal/login" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">¿Sos inquilino? Ingresá a tu portal →</Link></div>
    </div><p className="mt-6 text-center text-[11px] text-slate-600">NanoLabs SaaS · OnlyMob</p></div>
  </div>;
}
