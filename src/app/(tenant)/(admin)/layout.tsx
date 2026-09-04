import { redirect } from 'next/navigation';
import { resolveTenantContext } from '@/lib/tenant-context';
import { getAdminSession } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';

export default async function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await resolveTenantContext();
  const session = await getAdminSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar tenantName={tenant.name} userName={session.name} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
