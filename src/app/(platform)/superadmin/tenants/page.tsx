import { redirect } from 'next/navigation';
import { getSuperAdminSession } from '@/lib/auth';
import { getSaasPlatformAction } from '@/actions/saas-admin';
import { TenantsClient } from './tenants-client';
import './tenants.css';

export const dynamic = 'force-dynamic';

export default async function SuperAdminTenantsPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect('/superadmin/login');
  const data = await getSaasPlatformAction();
  return <TenantsClient tenants={data.tenants} plans={data.plans} />;
}
