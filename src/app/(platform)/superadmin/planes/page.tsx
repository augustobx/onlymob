import { redirect } from 'next/navigation';
import { getSuperAdminSession } from '@/lib/auth';
import { getSaasPlatformAction } from '@/actions/saas-admin';
import { PlansClient } from './plans-client';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPlansPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect('/superadmin/login');
  const data = await getSaasPlatformAction();
  return <PlansClient plans={data.plans} featureCatalog={data.featureCatalog} />;
}
