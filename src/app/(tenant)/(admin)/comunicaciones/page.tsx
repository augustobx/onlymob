import { Header } from '@/components/layout/header';
import { getCommunicationCenterAction } from '@/actions/communications';
import { CommunicationsClient } from './communications-client';

export const dynamic = 'force-dynamic';

export default async function CommunicationsPage() {
  const data = await getCommunicationCenterAction();
  return <div><Header title="Comunicaciones" subtitle="Inbox unificado · portal, email y WhatsApp" /><main className="app-page"><div className="page-container"><CommunicationsClient data={data as any} /></div></main></div>;
}
