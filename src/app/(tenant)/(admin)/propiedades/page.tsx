import { Header } from '@/components/layout/header';
import { getPropertiesAction } from '@/actions/properties';
import { PropertyTable } from './property-table';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const properties = await getPropertiesAction();
  return <div><Header title="Propiedades" subtitle={`${properties.length} inmuebles · gestión comercial, contractual y administrativa`}/><ModuleShell><PropertyTable initialProperties={properties}/></ModuleShell></div>;
}
