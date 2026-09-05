import { Header } from '@/components/layout/header';
import { getMaintenanceDataAction } from '@/actions/maintenance';
import { MaintenanceClient } from './maintenance-client';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  const data = await getMaintenanceDataAction();
  return (
    <div>
      <Header title="Mantenimiento e inspecciones" subtitle="Órdenes de trabajo, proveedores, costos, inspecciones y hallazgos" />
      <div className="p-8 max-w-7xl mx-auto">
        <MaintenanceClient data={data as any} />
      </div>
    </div>
  );
}
