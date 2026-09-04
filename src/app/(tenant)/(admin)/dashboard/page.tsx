import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { getDashboardMetricsAction } from '@/actions/debts-payments';
import { getPropertiesAction } from '@/actions/properties';
import { getGaragesAction } from '@/actions/garages';
import { getLatestICL } from '@/lib/bcra';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Building,
  Warehouse,
  ArrowUpRight,
  CreditCard,
  FilePlus,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [metrics, properties, garages, icl] = await Promise.all([
    getDashboardMetricsAction(),
    getPropertiesAction(),
    getGaragesAction(),
    getLatestICL(),
  ]);

  const propertiesWithDebt = properties.filter((p) => (p.activeLease?.pendingDebtTotal || 0) > 0);

  return (
    <div>
      <Header
        title="Panel General"
        subtitle="Métricas operativas, vencimientos y estado en tiempo real"
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/contratos"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Contratos & Aumentos</span>
            </Link>
            <Link
              href="/cobranzas"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Registrar Pago</span>
            </Link>
          </div>
        }
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Inmuebles Vencidos */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Alquileres Vencidos
              </span>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">
                {metrics.propertyDebtsOverdue}
              </span>
              <span className="text-xs text-rose-600 font-medium">contratos impagos</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {metrics.propertyDebtsDueSoon} adicionales vencen en los próximos 10 días
            </p>
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          </div>

          {/* Card 2: Cocheras Vencidas */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cocheras Vencidas
              </span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">
                {metrics.garageDebtsOverdue}
              </span>
              <span className="text-xs text-amber-600 font-medium">plazas impagas</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {metrics.garageDebtsDueSoon} cuotas por vencer en 10 días
            </p>
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          </div>

          {/* Card 3: Ocupación de Propiedades */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Inmuebles Alquilados
              </span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">
                {metrics.propertiesRented}
              </span>
              <span className="text-xs text-slate-500 font-medium">de {metrics.propertiesTotal} totales</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{
                  width: `${metrics.propertiesTotal ? (metrics.propertiesRented / metrics.propertiesTotal) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          </div>

          {/* Card 4: Recaudación del Mes */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cobrado este Mes
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {formatCurrency(metrics.totalRevenueMonth)}
              </span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <span>Recaudación activa conciliada</span>
            </p>
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          </div>
        </div>

        {/* BCRA Live Inflation & Contract Adjustments Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-indigo-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-medium border border-indigo-500/30">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Índice Oficial BCRA (Ley 27.551 / DNU)</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Valor Actual ICL: <span className="font-mono text-emerald-400">{icl.valor.toFixed(4)}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Último dato oficial publicado el {formatDate(icl.fecha)} ({icl.origen === 'api' ? 'Conexión Directa API' : 'CSV BCRA'}).
              Permite calcular aumentos de alquiler exactos según contrato.
            </p>
          </div>
          <Link
            href="/contratos"
            className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-500/30 flex-shrink-0"
          >
            <span>Simulador de Aumentos</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Dual Section: Inmuebles con saldo pendiente & Cocheras */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Propiedades con Deuda Pendiente */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Alquileres con Saldo Pendiente</h3>
                  <p className="text-xs text-slate-500">Inmuebles que registran cuotas impagas</p>
                </div>
                <Link
                  href="/cobranzas"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Ver todas</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {propertiesWithDebt.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No hay deudas pendientes</p>
                  <p className="text-xs text-slate-400">Todas las propiedades están al día.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {propertiesWithDebt.slice(0, 5).map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{p.code}</span>
                          <span className="text-xs text-slate-500 truncate max-w-[180px]">
                            {p.address}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Inquilino: <span className="font-medium text-slate-700">{p.activeLease?.renterName}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-rose-600 block">
                          {formatCurrency(p.activeLease?.pendingDebtTotal)}
                        </span>
                        <Link
                          href={`/cobranzas`}
                          className="text-[11px] text-indigo-600 hover:underline font-medium"
                        >
                          Cobrar
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cocheras & Ocupación */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Garajes & Cocheras</h3>
                  <p className="text-xs text-slate-500">Capacidad total y plazas asignadas</p>
                </div>
                <Link
                  href="/cocheras"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Mapa de plazas</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {garages.length === 0 ? (
                <div className="text-center py-10">
                  <Warehouse className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No hay garajes registrados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {garages.map((g) => {
                    const percent = g.totalSpaces > 0 ? Math.round((g.occupied / g.totalSpaces) * 100) : 0;
                    return (
                      <div key={g.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-slate-900">{g.name}</h4>
                          <span className="text-xs font-mono font-bold text-indigo-600">
                            {g.occupied} / {g.totalSpaces} plazas
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{g.address}</p>
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                          <span>{percent}% de ocupación</span>
                          <span className="text-emerald-600">{g.free} disponibles</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
