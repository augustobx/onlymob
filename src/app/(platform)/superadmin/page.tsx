import { redirect } from 'next/navigation';
import { getSuperAdminSession } from '@/lib/auth';
import { getTenantsAction } from '@/actions/superadmin';
import { SuperAdminClient } from './superadmin-client';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect('/superadmin/login');
  }

  const tenants = await getTenantsAction();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <SuperAdminClient initialTenants={tenants} />
      </div>
    </div>
  );
}
