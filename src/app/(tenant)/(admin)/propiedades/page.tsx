import { Header } from '@/components/layout/header';
import { getPropertiesAction } from '@/actions/properties';
import { PropertyTable } from './property-table';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const properties = await getPropertiesAction();

  return (
    <div>
      <Header
        title="Inmuebles & Propiedades"
        subtitle={`Administración de ${properties.length} propiedades registradas`}
      />
      <div className="p-8 max-w-7xl mx-auto">
        <PropertyTable initialProperties={properties} />
      </div>
    </div>
  );
}
