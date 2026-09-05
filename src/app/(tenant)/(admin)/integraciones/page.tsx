import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { getIntegrationsDataAction } from '@/actions/integrations';
import { resolveTenantContext } from '@/lib/tenant-context';
import { isTenantFeatureEnabled } from '@/lib/saas';
import { IntegrationsClient } from './integrations-client';

export const dynamic='force-dynamic';
export default async function IntegrationsPage(){
  const tenant=await resolveTenantContext(); if(!(await isTenantFeatureEnabled(tenant.id,'integrations',true))) notFound();
  const data=await getIntegrationsDataAction();
  return <div><Header title="Integraciones" subtitle="API v1, webhooks y herramientas de importación/exportación"/><main className="p-4 sm:p-8 max-w-7xl mx-auto"><IntegrationsClient data={JSON.parse(JSON.stringify(data))}/></main></div>;
}
