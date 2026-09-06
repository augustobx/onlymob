import { Header } from '@/components/layout/header';
import { getMaintenanceWorkspaceAction } from '@/actions/maintenance';
import { MaintenanceClient } from './maintenance-client';
import { MaintenanceQuickAccess } from './maintenance-quick-access';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  const data = await getMaintenanceWorkspaceAction();
  return <div><Header title="Mantenimiento" subtitle="Órdenes, proveedores e inspecciones conectados a propiedades y contratos"/><ModuleShell><MaintenanceQuickAccess/><MaintenanceClient data={data}/></ModuleShell></div>;
}
