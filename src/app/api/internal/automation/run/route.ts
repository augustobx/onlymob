import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runAutomationSweep } from '@/lib/automation-runner';

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
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId');
    const result = await runAutomationSweep({ tenantId });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[automation-runner]', error);
    return NextResponse.json({ error: 'Automation sweep failed' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
