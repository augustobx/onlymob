import { Header } from '@/components/layout/header';
import { getGarageRentersAction, getGaragesAction } from '@/actions/garages';
import { CocherasClient } from './cocheras-client';

export const dynamic = 'force-dynamic';

export default async function CocherasPage() {
  const [garages, renters] = await Promise.all([
    getGaragesAction(),
    getGarageRentersAction(),
  ]);

  return (
    <div>
      <Header
        title="Gestión de Cocheras & Garajes"
        subtitle="Plazas, contratos y ocupación desde una sola pantalla"
      />
      <div className="p-8 max-w-7xl mx-auto">
        <CocherasClient initialGarages={garages} renters={renters} />
      </div>
    </div>
  );
}
