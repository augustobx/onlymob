import { Header } from '@/components/layout/header';
import { getFinanceDataAction } from '@/actions/finance';
import { FinanceClient } from './finance-client';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic='force-dynamic';
export default async function FinancePage(){const data=await getFinanceDataAction();return <div><Header title="Finanzas" subtitle="Cajas, cuentas, movimientos y conciliación"/><ModuleShell><FinanceClient data={data as any}/></ModuleShell></div>}
