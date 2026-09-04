import Link from 'next/link';
import {
  Building2,
  Home,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Warehouse,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { getLatestICL } from '@/lib/bcra';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const icl = await getLatestICL();

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background visual glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-indigo-900/20 via-slate-900/10 to-transparent pointer-events-none blur-3xl" />

      {/* Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-extrabold shadow-lg shadow-indigo-600/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight">OnlyMob</span>
              <span className="text-[10px] text-indigo-400 font-semibold block -mt-1 uppercase tracking-wider">
                SaaS Inmobiliario
              </span>
            </div>
          </div>

          {/* Quick BCRA Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">ICL BCRA:</span>
            <span className="font-mono font-bold text-emerald-400">{icl.valor.toFixed(2)}</span>
            <span className="text-[10px] text-slate-500">({formatDate(icl.fecha)})</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal/login"
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Soy Inquilino
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
            >
              Acceso Inmobiliaria
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 lg:py-28 relative z-10 text-center space-y-8">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full text-xs font-semibold text-indigo-400">
          <span>NanoLabs SaaS Architecture • Multi-Tenant</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-4xl mx-auto leading-none">
          Gestión Inmobiliaria <br />
          <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
            Inteligente & Escalable
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Administrá inmuebles, cocheras con mapas interactivos, contratos con ajustes automáticos por
          ICL / IPC oficial del BCRA, generación masiva de cuotas y portal PWA para inquilinos.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <span>Ingresar al Panel de Gestión</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/portal/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-indigo-400" />
            <span>Portal de Inquilinos PWA</span>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Indexación Oficial BCRA</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Conexión directa en tiempo real con la API del Banco Central. Calculá y aplicá aumentos
              escalonados con trazabilidad histórica inmutable.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Mapa Visual de Cocheras</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Control interactivo de plazas libres y ocupadas. Asignación multi-plaza por contrato y
              seguimiento de pagos independiente.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Cuotas & Recibos Digitales</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generación masiva mensual de cuotas con fecha de vencimiento y emisión de recibos oficiales
              con importes en letras listos para imprimir.
            </p>
          </div>
        </div>

        {/* SuperAdmin Link in Footer */}
        <div className="pt-16 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
          <span>© 2026 NanoLabs • OnlyMob SaaS Engine</span>
          <Link
            href="/superadmin/login"
            className="hover:text-slate-400 inline-flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Acceso SuperAdmin</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
