import Link from 'next/link';
import { CreditCard, ShieldAlert } from 'lucide-react';

export default function SuspendedPage() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
    <section className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl shadow-black/30 sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400"><ShieldAlert className="h-8 w-8" /></div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[.18em] text-indigo-400">OnlyMob · NanoLabs SaaS</p>
      <h1 className="mt-2 text-3xl font-black text-white">Servicio suspendido</h1>
      <p className="mt-4 text-sm leading-6 text-slate-400">La membresía de esta inmobiliaria está vencida o temporalmente suspendida. Los datos permanecen preservados y el acceso se recupera al regularizar el servicio.</p>
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left"><div className="flex items-start gap-3"><CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><div><p className="text-sm font-bold text-white">Regularización</p><p className="mt-1 text-xs leading-5 text-slate-500">Contactá a NanoLabs para registrar el pago o revisar el estado de la membresía. No es necesario reprovisionar la cuenta.</p></div></div></div>
      <Link href="/login" className="mt-6 inline-flex rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">Volver a intentar</Link>
    </section>
  </main>;
}
