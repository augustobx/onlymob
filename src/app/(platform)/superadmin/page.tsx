import { redirect } from 'next/navigation';
import { getSuperAdminSession } from '@/lib/auth';
import { getSaasPlatformAction } from '@/actions/saas-admin';
import { SaasPanel } from './saas-panel';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect('/superadmin/login');
  const saas = await getSaasPlatformAction();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SaasPanel data={JSON.parse(JSON.stringify(saas))} superAdminName={session.name} />
    </div>
  );
}
