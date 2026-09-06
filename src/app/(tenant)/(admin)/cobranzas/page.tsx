import { Header } from '@/components/layout/header';
import { getDebtsAction } from '@/actions/debts-payments';
import { DebtsClient } from './debts-client';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic = 'force-dynamic';

export default async function CobranzasPage() {
  const debts = await getDebtsAction();
  return <div><Header title="Cobranzas & Registro de Pagos" subtitle="Control de deudas devengadas, cobranzas y emisión de recibos oficiales"/><ModuleShell><DebtsClient initialDebts={debts}/></ModuleShell></div>;
}
