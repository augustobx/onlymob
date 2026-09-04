import { Header } from '@/components/layout/header';
import { getPropertyManagementDataAction } from '@/actions/property-management';
import { PropertyManagementClient } from './property-management-client';

export const dynamic = 'force-dynamic';

export default async function PropertyManagementPage() {
  const data = await getPropertyManagementDataAction();
  return (
    <div>
      <Header title="Administración" subtitle="Gastos de propiedad, cargos recurrentes y liquidaciones a propietarios" />
      <div className="p-8 max-w-7xl mx-auto">
        <PropertyManagementClient data={data as any} />
      </div>
    </div>
  );
}
