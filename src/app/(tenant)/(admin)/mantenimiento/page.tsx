import { Header } from '@/components/layout/header';
import { getMaintenanceDataAction } from '@/actions/maintenance';
import { MaintenanceClient } from './maintenance-client';
import { MaintenanceQuickAccess } from './maintenance-quick-access';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  const data = await getMaintenanceDataAction();
  return <div><Header title="Mantenimiento e inspecciones" subtitle="Órdenes de trabajo, proveedores, costos, inspecciones y hallazgos"/><ModuleShell><MaintenanceQuickAccess requests={data.requests as any}/><MaintenanceClient data={data as any}/></ModuleShell></div>;
}
