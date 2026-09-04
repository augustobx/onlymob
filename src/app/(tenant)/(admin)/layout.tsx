import { redirect } from 'next/navigation';
import { getTenantAdminContext } from '@/lib/tenant-guard';
import { Sidebar } from '@/components/layout/sidebar';

export default async function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getTenantAdminContext();

  if (!context) {
    redirect('/login');
  }

  const { tenant, session } = context;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar tenantName={tenant.name} userName={session.name} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
