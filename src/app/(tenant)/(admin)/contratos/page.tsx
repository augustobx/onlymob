import { Header } from '@/components/layout/header';
import { getContractsPageDataAction } from '@/actions/leases';
import { ContractsClient } from './contracts-client';
import { ProfessionalLeaseManager } from './professional-lease-manager';
import { ModuleShell } from '@/components/ui/module-shell';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const data = await getContractsPageDataAction();
  return <div><Header title="Contratos" subtitle="Vigencia, ajustes, cuotas y administración contractual"/><ModuleShell><ContractsClient {...data}/><ProfessionalLeaseManager {...data}/></ModuleShell></div>;
}
