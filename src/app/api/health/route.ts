import { NextResponse } from 'next/server';
import { platformPrisma } from '@/lib/prisma-core';

export async function GET() {
  try {
    // Quick DB check
    await platformPrisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      service: 'onlymob',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'degraded',
        error: error.message || 'Database ping failed',
      },
      { status: 503 }
    );
  }
}
