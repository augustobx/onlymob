import { redirect } from 'next/navigation';
import { getTenantAdminContext } from '@/lib/tenant-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { EntitySelectEnhancer } from '@/components/ui/entity-select-enhancer';
import '../../uiux.css';

export default async function TenantAdminLayout({ children }: { children: React.ReactNode }) {
  const context = await getTenantAdminContext();
  if (!context) redirect('/login');
  const { tenant, session } = context;

  return (
    <div className="admin-shell">
      <EntitySelectEnhancer />
      <div className="hidden lg:block admin-shell__sidebar"><Sidebar tenantName={tenant.name} userName={session.name} /></div>
      <div className="admin-shell__content"><main className="min-h-screen pb-20 lg:pb-0">{children}</main></div>
      <MobileNav />
    </div>
  );
}
