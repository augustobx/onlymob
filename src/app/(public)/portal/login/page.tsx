'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, FileText, Lock, ReceiptText, ShieldCheck, User, Wrench } from 'lucide-react';
import { loginRenterAction } from '@/actions/auth-actions';

export default function RenterLoginPage() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await loginRenterAction(formData);
      if (!response.success) {
        setError(response.error || 'No pudimos iniciar sesión. Revisá tus datos.');
        return;
      }
      window.location.href = '/portal';
    });
  };

  return (
    <div className="pwa-login">
      <section className="pwa-login__hero">
        <div className="mx-auto w-full max-w-[460px]">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
              <img src="/onlymob-icon.svg" alt="" className="h-9 w-9 rounded-xl" />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight">OnlyMob</p>
              <p className="text-[10px] text-indigo-200">Portal de inquilinos</p>
            </div>
          </div>

          <p className="pwa-eyebrow text-indigo-200">Tu alquiler, simple</p>
          <h1 className="mt-3 max-w-sm text-[30px] font-black leading-[1.08] tracking-[-.045em] text-white">Todo lo importante, sin llamar a la inmobiliaria.</h1>
          <p className="mt-3 max-w-sm text-xs leading-5 text-slate-300">Consultá saldos, vencimientos, documentos, mensajes y mantenimiento desde el celular.</p>
        </div>
      </section>

      <section className="pwa-login__content">
        <div className="pwa-login__card">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-950">Ingresá a tu cuenta</h2>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">Usá el DNI o correo que tenés registrado en la inmobiliaria.</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-[11px] font-semibold leading-4 text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="pwa-field">
              <span>DNI o correo electrónico</span>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input name="identifier" type="text" required autoComplete="username" placeholder="Ej. 37925831" className="pwa-input !pl-10" />
              </div>
            </label>

            <label className="pwa-field">
              <span>Contraseña</span>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input name="password" type="password" required autoComplete="current-password" placeholder="Tu contraseña" className="pwa-input !pl-10" />
              </div>
            </label>

            <button type="submit" disabled={isPending} className="pwa-button !mt-6 w-full !min-h-12">
              <span>{isPending ? 'Ingresando...' : 'Entrar a mi alquiler'}</span>
              {!isPending && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-slate-50 px-3.5 py-3 text-[10px] leading-4 text-slate-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            Tu información se muestra únicamente después de validar tu acceso.
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniFeature icon={<ReceiptText />} label="Pagos" />
          <MiniFeature icon={<FileText />} label="Documentos" />
          <MiniFeature icon={<Wrench />} label="Arreglos" />
        </div>

        <p className="mt-6 text-center text-[10px] leading-4 text-slate-400">
          ¿No tenés clave? Pedila a tu inmobiliaria.<br />
          <Link href="/login" className="mt-1 inline-block font-semibold text-slate-500 hover:text-indigo-600">Acceso administrativo</Link>
        </p>
      </section>
    </div>
  );
}

function MiniFeature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2 py-3 text-[9px] font-bold text-slate-500 shadow-sm"><span className="text-indigo-500 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>{label}</div>;
}
