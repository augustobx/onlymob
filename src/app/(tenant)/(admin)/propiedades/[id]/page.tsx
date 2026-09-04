import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { getPropertyByIdAction } from '@/actions/properties';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Building,
  User,
  FileText,
  Calendar,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getPropertyByIdAction(id);

  if (!property) {
    notFound();
  }

  const activeLease = property.propertyLeases.find((l) => l.status === 'CURRENT');

  return (
    <div>
      <Header
        title={`Ficha Propiedad: ${property.code}`}
        subtitle={property.address}
        actionButton={
          <Link
            href="/propiedades"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Listado</span>
          </Link>
        }
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Top Cards: Property Details & Current Renter */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Datos Técnicos */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono font-extrabold text-2xl text-slate-900">
                {property.code}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  property.status === 'ALQUILADO'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {property.status}
              </span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Dirección</span>
                <span className="font-semibold text-slate-800 text-right">{property.address}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Tipo de Inmueble</span>
                <span className="font-semibold text-slate-800">{property.type}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Ambientes</span>
                <span className="font-semibold text-slate-800">{property.rooms || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Superficie</span>
                <span className="font-semibold text-slate-800">
                  {property.sqm ? `${property.sqm} m²` : '-'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">% Expensas</span>
                <span className="font-semibold text-slate-800">
                  {property.expensesShare ? `${property.expensesShare}%` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Inquilino Actual */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <User className="w-4 h-4" />
              <span>Inquilino Actual</span>
            </div>

            {activeLease ? (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-slate-500">Nombre Completo</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {activeLease.renter.firstName} {activeLease.renter.lastName}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-slate-500">DNI</p>
                    <p className="font-semibold text-slate-800 font-mono">
                      {activeLease.renter.dni}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Teléfono</p>
                    <p className="font-semibold text-slate-800">
                      {activeLease.renter.phone || '-'}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-slate-500">Email</p>
                  <p className="font-semibold text-slate-800 truncate">
                    {activeLease.renter.email || '-'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Propiedad disponible sin inquilino asignado.
              </div>
            )}
          </div>

          {/* Card 3: Condiciones de Alquiler Vigentes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <CreditCard className="w-4 h-4" />
              <span>Contrato de Alquiler</span>
            </div>

            {activeLease ? (
              <div className="space-y-3 text-xs divide-y divide-slate-100">
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-slate-500">Alquiler Actual</span>
                  <span className="font-mono font-extrabold text-lg text-emerald-600">
                    {formatCurrency(activeLease.currentRent)}/mes
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Vigencia</span>
                  <span className="font-semibold text-slate-800">
                    {formatDate(activeLease.startDate)} al {formatDate(activeLease.endDate)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Frecuencia de Ajuste</span>
                  <span className="font-semibold text-indigo-600">
                    Cada {activeLease.updatePeriodMonths} meses (ICL / IPC)
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Depósito en Garantía</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatCurrency(activeLease.deposit)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No hay contrato activo vigente.
              </div>
            )}
          </div>
        </div>

        {/* Historial de Aumentos de Alquiler */}
        {activeLease && activeLease.rentHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Historial Inmutable de Aumentos</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Alquiler Anterior</th>
                    <th className="px-4 py-2.5">Nuevo Alquiler</th>
                    <th className="px-4 py-2.5">Variación %</th>
                    <th className="px-4 py-2.5">Índice Aplicado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeLease.rentHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {formatDate(h.changeDate)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {formatCurrency(h.oldRent)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                        {formatCurrency(h.newRent)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-indigo-600">
                        {h.percent ? `+${h.percent}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{h.indexUsed || 'ICL / Fijo'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Deudas y Pagos */}
        {activeLease && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Estado de Cuenta & Cobranzas</span>
              </div>
              <Link
                href="/cobranzas"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Ir a módulo de cobranzas →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Concepto</th>
                    <th className="px-4 py-2.5">Vencimiento</th>
                    <th className="px-4 py-2.5">Importe</th>
                    <th className="px-4 py-2.5">Pagado</th>
                    <th className="px-4 py-2.5">Saldo</th>
                    <th className="px-4 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeLease.debts.map((d) => {
                    const balance = d.amount - d.paidAmount;
                    const isOverdue = d.status !== 'PAID' && new Date(d.dueDate) < new Date();

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{d.description}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(d.dueDate)}</td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-700">
                          {formatCurrency(d.amount)}
                        </td>
                        <td className="px-4 py-3 font-mono text-emerald-600">
                          {formatCurrency(d.paidAmount)}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {formatCurrency(balance)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {d.status === 'PAID'
                              ? 'Pagado'
                              : isOverdue
                              ? 'Vencido'
                              : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
