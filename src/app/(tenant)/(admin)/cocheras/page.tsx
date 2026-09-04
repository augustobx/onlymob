import { Header } from '@/components/layout/header';
import { getGaragesAction } from '@/actions/garages';
import { CocherasClient } from './cocheras-client';

export const dynamic = 'force-dynamic';

export default async function CocherasPage() {
  const garages = await getGaragesAction();

  return (
    <div>
      <Header
        title="Gestión de Cocheras & Garajes"
        subtitle="Control visual de plazas, ocupación y asignaciones"
      />
      <div className="p-8 max-w-7xl mx-auto">
        <CocherasClient initialGarages={garages} />
      </div>
    </div>
  );
}
