import { Header } from '@/components/layout/header';
import { getLeasesAction } from '@/actions/leases';
import { getPropertiesAction } from '@/actions/properties';
import { getRentersAction } from '@/actions/renters';
import { getGaragesAction } from '@/actions/garages';
import { getLatestICL } from '@/lib/bcra';
import { ContractsClient } from './contracts-client';

export const dynamic = 'force-dynamic';

export default async function ContratosPage() {
  const [leases, properties, renters, garages, icl] = await Promise.all([
    getLeasesAction(),
    getPropertiesAction(),
    getRentersAction(),
    getGaragesAction(),
    getLatestICL(),
  ]);

  const availableProperties = properties.filter((p) => p.status === 'DISPONIBLE');
  const availableSpaces = garages.flatMap((g) =>
    g.spaces
      .filter((s) => s.status === 'FREE')
      .map((s) => ({
        id: s.id,
        spaceNumber: s.spaceNumber,
        garageName: g.name,
      }))
  );

  return (
    <div>
      <Header
        title="Contratos & Ajustes por Inflación"
        subtitle="Administración de locaciones, indexación ICL y devengamiento de cuotas"
      />
      <div className="p-8 max-w-7xl mx-auto">
        <ContractsClient
          propertyLeases={leases.propertyLeases}
          garageLeases={leases.garageLeases}
          properties={availableProperties}
          renters={renters}
          availableSpaces={availableSpaces}
          currentIclValue={icl.valor}
        />
      </div>
    </div>
  );
}
