import { Header } from '@/components/layout/header';
import { getAgendaDataAction } from '@/actions/crm';
import { AgendaClient } from './agenda-client';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const data = await getAgendaDataAction();
  return (
    <div>
      <Header title="Agenda & tareas" subtitle="Visitas, reuniones, seguimientos y vencimientos del equipo" />
      <div className="p-8 max-w-7xl mx-auto">
        <AgendaClient data={data as any} />
      </div>
    </div>
  );
}
