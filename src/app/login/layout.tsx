import { redirect } from 'next/navigation';
import { getTenantRequestAccess } from '@/lib/tenant-context';

export default async function TenantLoginLayout({ children }: { children: React.ReactNode }) {
  const access = await getTenantRequestAccess();
  if (access.state === 'SUSPENDED') redirect('/suspendido');
  return <>{children}</>;
}
