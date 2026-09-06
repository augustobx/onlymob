import { Header } from '@/components/layout/header';
import { getAgendaDataAction } from '@/actions/crm';
import { AgendaClient } from './agenda-client';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const data = await getAgendaDataAction();
  return <div><Header title="Agenda & tareas" subtitle="Visitas, reuniones, seguimientos y vencimientos del equipo"/><ModuleShell><AgendaClient data={data as any}/></ModuleShell></div>;
}
