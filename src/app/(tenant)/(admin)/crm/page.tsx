import { Header } from '@/components/layout/header';
import { getCrmDataAction } from '@/actions/crm';
import { CrmClient } from './crm-client';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic = 'force-dynamic';

export default async function CrmPage() {
  const data = await getCrmDataAction();
  return <div><Header title="CRM inmobiliario" subtitle="Leads, seguimiento, demandas y matching de propiedades"/><ModuleShell><CrmClient data={data as any}/></ModuleShell></div>;
}
