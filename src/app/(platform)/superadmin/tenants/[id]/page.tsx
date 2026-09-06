import { notFound, redirect } from 'next/navigation';
import { getSuperAdminSession } from '@/lib/auth';
import { getSaasPlatformAction, getSaasTenantAction } from '@/actions/saas-admin';
import { TenantDetailClient } from './tenant-detail-client';

export const dynamic = 'force-dynamic';

export default async function SuperAdminTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect('/superadmin/login');
  const { id } = await params;
  try {
    const [tenant, platform] = await Promise.all([getSaasTenantAction(id), getSaasPlatformAction()]);
    return <TenantDetailClient tenant={tenant} plans={platform.plans} featureCatalog={platform.featureCatalog} />;
  } catch (error: any) {
    if (error?.message === 'Tenant inexistente.') notFound();
    throw error;
  }
}
