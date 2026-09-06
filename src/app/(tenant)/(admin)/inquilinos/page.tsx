import { Header } from '@/components/layout/header';
import { getRentersAction } from '@/actions/renters';
import { RentersClient } from './renters-client';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic = 'force-dynamic';

export default async function InquilinosPage() {
  const renters = await getRentersAction();
  return <div><Header title="Directorio de Inquilinos" subtitle={`Administración de ${renters.length} locatarios registrados`}/><ModuleShell><RentersClient initialRenters={renters}/></ModuleShell></div>;
}
