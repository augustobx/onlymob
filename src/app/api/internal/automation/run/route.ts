import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runAutomationSweep } from '@/lib/automation-runner';
import { dispatchPendingWebhooks } from '@/lib/integrations';
import { dispatchPendingCommunications } from '@/lib/communication-dispatcher';
import { reconcileExpiredMemberships } from '@/lib/membership';

function authorized(request: NextRequest) {
  const secret = process.env.AUTOMATION_CRON_SECRET;
  if (!secret || secret.length < 24) return false;

  const auth = request.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : request.headers.get('x-automation-secret') || '';
  if (!provided) return false;

  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

async function handle(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId');
    // La membresía es política de plataforma y se reconcilia aunque el tenant tenga automation OFF.
    const membership = await reconcileExpiredMemberships({ tenantId });
    const [automation, webhooks, communications] = await Promise.all([
      runAutomationSweep({ tenantId }),
      dispatchPendingWebhooks({ tenantId, limit: 100 }),
      dispatchPendingCommunications({ tenantId, limit: 60 }),
    ]);
    return NextResponse.json({ ok: true, membership, automation, webhooks, communications });
  } catch (error) {
    console.error('[automation-runner]', error);
    return NextResponse.json({ error: 'Automation sweep failed' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
