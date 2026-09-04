import { Header } from '@/components/layout/header';
import { resolveTenantContext } from '@/lib/tenant-context';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const tenant = await resolveTenantContext();

  return (
    <div>
      <Header
        title="Configuraciones Generales"
        subtitle="Ajustes de marca, encabezados de recibos y parámetros del sistema"
      />
      <div className="p-8 max-w-7xl mx-auto">
        <SettingsForm tenant={tenant} />
      </div>
    </div>
  );
}
