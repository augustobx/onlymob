import { Header } from '@/components/layout/header';
import { getOperationsDataAction } from '@/actions/operations';
import { OperationsClient } from './operations-client';

export const dynamic = 'force-dynamic';

export default async function OperationsPage() {
  const data = await getOperationsDataAction();
  return (
    <div>
      <Header title="Operaciones comerciales" subtitle="Publicaciones, reservas, negociación y cierres" />
      <div className="p-8 max-w-7xl mx-auto">
        <OperationsClient data={data as any} />
      </div>
    </div>
  );
}
