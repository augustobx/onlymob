import { Header } from '@/components/layout/header';
import { getFinanceDataAction } from '@/actions/finance';
import { FinanceClient } from './finance-client';

export const dynamic='force-dynamic';
export default async function FinancePage(){const data=await getFinanceDataAction();return <div><Header title="Finanzas" subtitle="Cajas, cuentas, movimientos y conciliación"/><main className="app-page"><div className="page-container"><FinanceClient data={data as any}/></div></main></div>}
