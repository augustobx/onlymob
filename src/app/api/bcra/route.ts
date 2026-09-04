import { NextResponse } from 'next/server';
import { getLatestICL } from '@/lib/bcra';

export async function GET() {
  try {
    const icl = await getLatestICL();
    return NextResponse.json({
      success: true,
      data: icl,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error fetching BCRA ICL',
      },
      { status: 500 }
    );
  }
}
