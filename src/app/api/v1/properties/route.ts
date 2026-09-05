import { NextResponse } from 'next/server';
import { platformPrisma } from '@/lib/prisma-core';
import { authenticateApiRequest } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, 'read:properties');
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const properties = await platformPrisma.property.findMany({
    where: { tenantId: auth.tenantId, archivedAt: null, status: { not: 'ARCHIVADO' } },
    select: { id: true, code: true, address: true, type: true, operation: true, commercialStatus: true, city: true, province: true, rooms: true, bedrooms: true, bathrooms: true, sqm: true, rentPrice: true, salePrice: true, currency: true, publicDescription: true, coverImageUrl: true, availableFrom: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' }, take: 500,
  });
  return NextResponse.json({ data: properties.map((p) => ({ ...p, sqm: p.sqm == null ? null : Number(p.sqm), rentPrice: p.rentPrice == null ? null : Number(p.rentPrice), salePrice: p.salePrice == null ? null : Number(p.salePrice) })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
