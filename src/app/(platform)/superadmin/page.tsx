import { redirect } from 'next/navigation';
import { getSuperAdminSession } from '@/lib/auth';
import { getTenantsAction } from '@/actions/superadmin';
import { getSaasPlatformAction } from '@/actions/saas-admin';
import { SuperAdminClient } from './superadmin-client';
import { SaasPanel } from './saas-panel';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect('/superadmin/login');
  const [tenants, saas] = await Promise.all([getTenantsAction(), getSaasPlatformAction()]);
  return <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10"><div className="max-w-7xl mx-auto space-y-10"><SuperAdminClient initialTenants={tenants} /><SaasPanel data={JSON.parse(JSON.stringify(saas))} /></div></div>;
}
