import { authenticateApiRequest } from '@/lib/integrations';
import { platformPrisma } from '@/lib/prisma-core';
import { toCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, 'export:properties');
  if (!auth) return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401, headers: { 'content-type': 'application/json' } });
  const rows = await platformPrisma.property.findMany({ where: { tenantId: auth.tenantId, archivedAt: null }, orderBy: { code: 'asc' } });
  const csv = toCsv(['id','code','address','type','operation','commercialStatus','city','province','rooms','bedrooms','bathrooms','sqm','rentPrice','salePrice','currency'], rows.map((p) => [p.id,p.code,p.address,p.type,p.operation,p.commercialStatus,p.city,p.province,p.rooms,p.bedrooms,p.bathrooms,p.sqm == null ? '' : Number(p.sqm),p.rentPrice == null ? '' : Number(p.rentPrice),p.salePrice == null ? '' : Number(p.salePrice),p.currency]));
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="onlymob-properties.csv"', 'cache-control': 'private, no-store' } });
}
