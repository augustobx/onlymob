import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';

export const dynamic = 'force-dynamic';

type EntityKind =
  | 'property'
  | 'renter'
  | 'contact'
  | 'owner'
  | 'provider'
  | 'guarantor'
  | 'user'
  | 'lead'
  | 'lease'
  | 'debt'
  | 'garage';

type SearchResult = {
  value: string;
  label: string;
  description?: string | null;
};

function compact(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part?.trim())).join(' · ');
}

function cleanQuery(value: string | null) {
  return (value || '').trim().slice(0, 120);
}

function limitFrom(value: string | null) {
  const parsed = Number(value || 15);
  if (!Number.isFinite(parsed)) return 15;
  return Math.max(5, Math.min(25, Math.trunc(parsed)));
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenantContext();
    const session = await getAdminSession(tenant.id);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const entity = request.nextUrl.searchParams.get('entity') as EntityKind | null;
    const q = cleanQuery(request.nextUrl.searchParams.get('q'));
    const take = limitFrom(request.nextUrl.searchParams.get('limit'));

    if (!entity) return NextResponse.json({ results: [] satisfies SearchResult[] });

    let results: SearchResult[] = [];

    if (entity === 'property') {
      const rows = await platformPrisma.property.findMany({
        where: {
          tenantId: tenant.id,
          archivedAt: null,
          status: { not: 'ARCHIVADO' },
          ...(q ? {
            OR: [
              { code: { contains: q } },
              { address: { contains: q } },
              { street: { contains: q } },
              { city: { contains: q } },
              { province: { contains: q } },
              {
                owners: {
                  some: {
                    contact: {
                      OR: [
                        { firstName: { contains: q } },
                        { lastName: { contains: q } },
                        { companyName: { contains: q } },
                        { documentNumber: { contains: q } },
                        { cuit: { contains: q } },
                        { email: { contains: q } },
                        { phone: { contains: q } },
                      ],
                    },
                  },
                },
              },
              {
                propertyLeases: {
                  some: {
                    renter: {
                      OR: [
                        { firstName: { contains: q } },
                        { lastName: { contains: q } },
                        { dni: { contains: q } },
                        { email: { contains: q } },
                        { phone: { contains: q } },
                      ],
                    },
                  },
                },
              },
            ],
          } : {}),
        },
        select: {
          id: true,
          code: true,
          address: true,
          city: true,
          province: true,
          owners: {
            take: 2,
            orderBy: { isPrimary: 'desc' },
            select: { contact: { select: { firstName: true, lastName: true, companyName: true } } },
          },
        },
        orderBy: { code: 'asc' },
        take,
      });

      results = rows.map((row) => ({
        value: row.id,
        label: `${row.code} · ${row.address}`,
        description: compact([
          [row.city, row.province].filter(Boolean).join(', '),
          row.owners[0]
            ? `Prop.: ${row.owners[0].contact.companyName || `${row.owners[0].contact.firstName} ${row.owners[0].contact.lastName}`}`
            : null,
        ]),
      }));
    } else if (entity === 'renter') {
      const rows = await platformPrisma.propertyRenter.findMany({
        where: {
          tenantId: tenant.id,
          status: 'ACTIVE',
          ...(q ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { dni: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
              { address: { contains: q } },
              { propertyLeases: { some: { property: { OR: [{ code: { contains: q } }, { address: { contains: q } }] } } } },
            ],
          } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
          email: true,
          phone: true,
          propertyLeases: {
            where: { status: { in: ['CURRENT', 'EXPIRING', 'RENEWED'] } },
            take: 1,
            select: { property: { select: { code: true, address: true } } },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take,
      });

      results = rows.map((row) => ({
        value: row.id,
        label: `${row.lastName}, ${row.firstName}`,
        description: compact([
          `DNI ${row.dni}`,
          row.phone,
          row.email,
          row.propertyLeases[0] ? `${row.propertyLeases[0].property.code} · ${row.propertyLeases[0].property.address}` : null,
        ]),
      }));
    } else if (['contact', 'owner', 'provider', 'guarantor'].includes(entity)) {
      const role = entity === 'owner' ? 'OWNER' : entity === 'provider' ? 'PROVIDER' : entity === 'guarantor' ? 'GUARANTOR' : null;
      const rows = await platformPrisma.contact.findMany({
        where: {
          tenantId: tenant.id,
          archivedAt: null,
          isActive: true,
          ...(role ? { roles: { some: { role: role as any } } } : {}),
          ...(q ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { companyName: { contains: q } },
              { documentNumber: { contains: q } },
              { cuit: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
              { alternatePhone: { contains: q } },
              { address: { contains: q } },
              { city: { contains: q } },
            ],
          } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          documentNumber: true,
          cuit: true,
          email: true,
          phone: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take,
      });

      results = rows.map((row) => ({
        value: row.id,
        label: row.companyName || `${row.lastName}, ${row.firstName}`,
        description: compact([
          row.documentNumber ? `Doc. ${row.documentNumber}` : null,
          row.cuit ? `CUIT ${row.cuit}` : null,
          row.phone,
          row.email,
        ]),
      }));
    } else if (entity === 'user') {
      const rows = await platformPrisma.user.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
          ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
        take,
      });
      results = rows.map((row) => ({ value: row.id, label: row.name, description: row.email }));
    } else if (entity === 'lead') {
      const rows = await platformPrisma.lead.findMany({
        where: {
          tenantId: tenant.id,
          status: { notIn: ['WON', 'LOST'] },
          ...(q ? {
            OR: [
              { title: { contains: q } },
              { source: { contains: q } },
              { channel: { contains: q } },
              { contact: { firstName: { contains: q } } },
              { contact: { lastName: { contains: q } } },
              { contact: { documentNumber: { contains: q } } },
              { contact: { email: { contains: q } } },
              { contact: { phone: { contains: q } } },
            ],
          } : {}),
        },
        select: {
          id: true,
          title: true,
          status: true,
          contact: { select: { firstName: true, lastName: true, phone: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take,
      });
      results = rows.map((row) => ({
        value: row.id,
        label: row.title,
        description: compact([`${row.contact.firstName} ${row.contact.lastName}`, row.contact.phone, row.status]),
      }));
    } else if (entity === 'lease') {
      const rows = await platformPrisma.propertyLease.findMany({
        where: {
          tenantId: tenant.id,
          status: { in: ['DRAFT', 'CURRENT', 'EXPIRING', 'RENEWED'] },
          ...(q ? {
            OR: [
              { property: { code: { contains: q } } },
              { property: { address: { contains: q } } },
              { renter: { firstName: { contains: q } } },
              { renter: { lastName: { contains: q } } },
              { renter: { dni: { contains: q } } },
            ],
          } : {}),
        },
        select: {
          id: true,
          status: true,
          property: { select: { code: true, address: true } },
          renter: { select: { firstName: true, lastName: true, dni: true } },
        },
        orderBy: { endDate: 'asc' },
        take,
      });
      results = rows.map((row) => ({
        value: row.id,
        label: `${row.property.code} · ${row.property.address}`,
        description: `${row.renter.lastName}, ${row.renter.firstName} · DNI ${row.renter.dni} · ${row.status}`,
      }));
    } else if (entity === 'debt') {
      const rows = await platformPrisma.debt.findMany({
        where: {
          tenantId: tenant.id,
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          ...(q ? {
            OR: [
              { description: { contains: q } },
              { renter: { firstName: { contains: q } } },
              { renter: { lastName: { contains: q } } },
              { renter: { dni: { contains: q } } },
              { propertyLease: { property: { code: { contains: q } } } },
              { propertyLease: { property: { address: { contains: q } } } },
            ],
          } : {}),
        },
        select: {
          id: true,
          description: true,
          amount: true,
          paidAmount: true,
          dueDate: true,
          renter: { select: { firstName: true, lastName: true, dni: true } },
          propertyLease: { select: { property: { select: { code: true, address: true } } } },
        },
        orderBy: { dueDate: 'asc' },
        take,
      });
      results = rows.map((row) => ({
        value: row.id,
        label: row.description,
        description: compact([
          `${row.renter.lastName}, ${row.renter.firstName} · DNI ${row.renter.dni}`,
          row.propertyLease ? `${row.propertyLease.property.code} · ${row.propertyLease.property.address}` : null,
          `Saldo $${(Number(row.amount) - Number(row.paidAmount)).toLocaleString('es-AR')}`,
        ]),
      }));
    } else if (entity === 'garage') {
      const rows = await platformPrisma.garage.findMany({
        where: {
          tenantId: tenant.id,
          ...(q ? { OR: [{ name: { contains: q } }, { address: { contains: q } }] } : {}),
        },
        select: { id: true, name: true, address: true, totalSpaces: true },
        orderBy: { name: 'asc' },
        take,
      });
      results = rows.map((row) => ({ value: row.id, label: row.name, description: `${row.address} · ${row.totalSpaces} plazas` }));
    }

    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[entity-search]', error);
    return NextResponse.json({ error: 'SEARCH_FAILED', results: [] }, { status: 500 });
  }
}
