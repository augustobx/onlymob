import { Header } from '@/components/layout/header';
import { getCrmDataAction } from '@/actions/crm';
import { CrmClient } from './crm-client';

export const dynamic = 'force-dynamic';

export default async function CrmPage() {
  const data = await getCrmDataAction();

  return (
    <div>
      <Header title="CRM inmobiliario" subtitle="Leads, seguimiento, demandas y matching de propiedades" />
      <div className="p-8 max-w-[1600px] mx-auto">
        <CrmClient data={data as any} />
      </div>
    </div>
  );
}
