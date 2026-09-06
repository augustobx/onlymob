import { Header } from '@/components/layout/header';
import { getPropertyManagementDataAction } from '@/actions/property-management';
import { PropertyManagementClient } from './property-management-client';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic = 'force-dynamic';

export default async function PropertyManagementPage() {
  const data = await getPropertyManagementDataAction();
  return <div><Header title="Administración" subtitle="Gastos de propiedad, cargos recurrentes y liquidaciones a propietarios"/><ModuleShell><PropertyManagementClient data={data as any}/></ModuleShell></div>;
}
