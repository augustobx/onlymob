import { Header } from '@/components/layout/header';
import { getRentersAction } from '@/actions/renters';
import { RentersClient } from './renters-client';

export const dynamic = 'force-dynamic';

export default async function InquilinosPage() {
  const renters = await getRentersAction();

  return (
    <div>
      <Header
        title="Directorio de Inquilinos"
        subtitle={`Administración de ${renters.length} locatarios registrados`}
      />
      <div className="p-8 max-w-7xl mx-auto">
        <RentersClient initialRenters={renters} />
      </div>
    </div>
  );
}
