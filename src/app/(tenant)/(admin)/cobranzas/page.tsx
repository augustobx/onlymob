import { Header } from '@/components/layout/header';
import { getDebtsAction } from '@/actions/debts-payments';
import { DebtsClient } from './debts-client';

export const dynamic = 'force-dynamic';

export default async function CobranzasPage() {
  const debts = await getDebtsAction();

  return (
    <div>
      <Header
        title="Cobranzas & Registro de Pagos"
        subtitle="Control de deudas devengadas, cobranzas y emisión de recibos oficiales"
      />
      <div className="p-8 max-w-7xl mx-auto">
        <DebtsClient initialDebts={debts} />
      </div>
    </div>
  );
}
