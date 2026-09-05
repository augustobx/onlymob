'use server';

import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';
import { adjustmentMethodLabel } from '@/lib/lease-labels';

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export async function getProperty360Action(propertyId: string) {
  const { tenant } = await requirePermission('properties', 'read');
  const property = await platformPrisma.property.findFirst({
    where: { id: propertyId, tenantId: tenant.id, archivedAt: null },
    include: {
      agent: { select: { id: true, name: true, email: true } },
      owners: {
        include: { contact: { include: { roles: true } } },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
      propertyLeases: {
        orderBy: { createdAt: 'desc' },
        include: {
          renter: true,
          guarantor: true,
          rentHistory: { orderBy: { changeDate: 'desc' } },
          recurringCharges: { orderBy: { createdAt: 'desc' } },
          debts: { include: { payments: { orderBy: { paidAt: 'desc' } } }, orderBy: { dueDate: 'desc' } },
          documents: { orderBy: { uploadedAt: 'desc' } },
        },
      },
      documents: { orderBy: { uploadedAt: 'desc' } },
      leadPropertyInterests: {
        orderBy: { updatedAt: 'desc' },
        include: {
          lead: {
            include: {
              contact: true,
              agent: { select: { id: true, name: true } },
            },
          },
        },
      },
      tasks: {
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
        include: {
          assignee: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          lead: { select: { id: true, title: true } },
        },
      },
      calendarEvents: {
        orderBy: { startsAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          lead: { select: { id: true, title: true } },
          agent: { select: { id: true, name: true } },
        },
      },
      publications: { orderBy: { updatedAt: 'desc' } },
      reservations: {
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          lead: { select: { id: true, title: true } },
          agent: { select: { id: true, name: true } },
        },
      },
      deals: {
        orderBy: { updatedAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          lead: { select: { id: true, title: true } },
          agent: { select: { id: true, name: true } },
          propertyLease: { select: { id: true, status: true, startDate: true, endDate: true } },
        },
      },
      propertyExpenses: {
        orderBy: { createdAt: 'desc' },
        include: {
          provider: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          owner: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        },
      },
      settlementLines: {
        orderBy: { createdAt: 'desc' },
        include: {
          settlement: {
            include: { owner: { select: { id: true, firstName: true, lastName: true, companyName: true } } },
          },
        },
      },
      maintenanceRequests: {
        orderBy: { updatedAt: 'desc' },
        include: {
          renter: { select: { id: true, firstName: true, lastName: true, dni: true } },
          provider: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          assignedUser: { select: { id: true, name: true } },
          events: { orderBy: { createdAt: 'desc' }, take: 20 },
          documents: { orderBy: { uploadedAt: 'desc' } },
        },
      },
      inspections: {
        orderBy: { createdAt: 'desc' },
        include: {
          renter: { select: { id: true, firstName: true, lastName: true } },
          inspector: { select: { id: true, name: true } },
          findings: { orderBy: { createdAt: 'desc' } },
          documents: { orderBy: { uploadedAt: 'desc' } },
        },
      },
    },
  });

  if (!property) return null;

  const [activity, communications, financialMovements] = await Promise.all([
    platformPrisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT a.id,a.eventKey,a.title,a.description,a.entityType,a.entityId,a.metadata,a.createdAt,
             u.name AS actorName
      FROM ActivityEvent a
      LEFT JOIN User u ON u.id=a.actorUserId AND u.tenantId=a.tenantId
      WHERE a.tenantId=${tenant.id} AND a.propertyId=${propertyId}
      ORDER BY a.createdAt DESC LIMIT 150
    `),
    platformPrisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT t.id,t.subject,t.status,t.lastMessageAt,t.updatedAt,
             COUNT(m.id) AS messageCount,
             MAX(CASE WHEN m.readAt IS NULL AND m.direction='INBOUND' THEN 1 ELSE 0 END) AS hasUnread
      FROM CommunicationThread t
      LEFT JOIN CommunicationMessage m ON m.threadId=t.id AND m.tenantId=t.tenantId
      WHERE t.tenantId=${tenant.id} AND t.propertyId=${propertyId}
      GROUP BY t.id,t.subject,t.status,t.lastMessageAt,t.updatedAt
      ORDER BY COALESCE(t.lastMessageAt,t.updatedAt) DESC LIMIT 50
    `),
    platformPrisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT fm.id,fm.type,fm.amount,fm.currency,fm.concept,fm.reference,fm.reconciliationStatus,fm.occurredAt,
             fa.name AS accountName,fa.type AS accountType
      FROM FinancialMovement fm
      JOIN FinancialAccount fa ON fa.id=fm.accountId AND fa.tenantId=fm.tenantId
      WHERE fm.tenantId=${tenant.id} AND fm.propertyId=${propertyId}
      ORDER BY fm.occurredAt DESC LIMIT 150
    `),
  ]);

  const propertyForView = {
    ...property,
    propertyLeases: property.propertyLeases.map((lease) => ({
      ...lease,
      adjustmentMethod: adjustmentMethodLabel(lease.adjustmentMethod),
    })),
  };

  return serialize({ property: propertyForView, activity, communications, financialMovements });
}

export async function getContact360Action(contactId: string) {
  const { tenant } = await requirePermission('contacts', 'read');
  const contact = await platformPrisma.contact.findFirst({
    where: { id: contactId, tenantId: tenant.id, archivedAt: null },
    include: {
      roles: true,
      ownedProperties: {
        include: {
          property: {
            include: {
              agent: { select: { id: true, name: true } },
              propertyLeases: { where: { status: { in: ['CURRENT', 'EXPIRING'] } }, include: { renter: true } },
            },
          },
        },
        orderBy: { isPrimary: 'desc' },
      },
      leads: { include: { agent: { select: { id: true, name: true } }, propertyInterests: { include: { property: { select: { id: true, code: true, address: true } } } } }, orderBy: { updatedAt: 'desc' } },
      demands: { orderBy: { updatedAt: 'desc' } },
      tasks: { include: { property: { select: { id: true, code: true, address: true } }, assignee: { select: { id: true, name: true } } }, orderBy: { updatedAt: 'desc' } },
      calendarEvents: { include: { property: { select: { id: true, code: true, address: true } }, agent: { select: { id: true, name: true } } }, orderBy: { startsAt: 'desc' } },
      reservations: { include: { property: { select: { id: true, code: true, address: true } }, agent: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      deals: { include: { property: { select: { id: true, code: true, address: true } }, agent: { select: { id: true, name: true } } }, orderBy: { updatedAt: 'desc' } },
      providedExpenses: { include: { property: { select: { id: true, code: true, address: true } } }, orderBy: { createdAt: 'desc' } },
      chargedOwnerExpenses: { include: { property: { select: { id: true, code: true, address: true } } }, orderBy: { createdAt: 'desc' } },
      ownerSettlements: { include: { lines: { include: { property: { select: { id: true, code: true, address: true } } } } }, orderBy: { createdAt: 'desc' } },
      guaranteedLeases: { include: { property: { select: { id: true, code: true, address: true } }, renter: true }, orderBy: { createdAt: 'desc' } },
      providerProfile: true,
      providedMaintenance: { include: { property: { select: { id: true, code: true, address: true } } }, orderBy: { updatedAt: 'desc' } },
    },
  });

  if (!contact) return null;

  const propertyIds = contact.ownedProperties.map((item) => item.propertyId);
  const [activity, communications, financialMovements] = await Promise.all([
    platformPrisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT a.id,a.eventKey,a.title,a.description,a.entityType,a.entityId,a.propertyId,a.metadata,a.createdAt,
             p.code AS propertyCode,p.address AS propertyAddress,u.name AS actorName
      FROM ActivityEvent a
      LEFT JOIN Property p ON p.id=a.propertyId AND p.tenantId=a.tenantId
      LEFT JOIN User u ON u.id=a.actorUserId AND u.tenantId=a.tenantId
      WHERE a.tenantId=${tenant.id} AND a.contactId=${contactId}
      ORDER BY a.createdAt DESC LIMIT 150
    `),
    platformPrisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT t.id,t.subject,t.status,t.propertyId,t.lastMessageAt,t.updatedAt,COUNT(m.id) AS messageCount
      FROM CommunicationThread t
      LEFT JOIN CommunicationMessage m ON m.threadId=t.id AND m.tenantId=t.tenantId
      WHERE t.tenantId=${tenant.id} AND t.contactId=${contactId}
      GROUP BY t.id,t.subject,t.status,t.propertyId,t.lastMessageAt,t.updatedAt
      ORDER BY COALESCE(t.lastMessageAt,t.updatedAt) DESC LIMIT 50
    `),
    platformPrisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT fm.id,fm.type,fm.amount,fm.currency,fm.concept,fm.propertyId,fm.reference,fm.reconciliationStatus,fm.occurredAt,fa.name AS accountName
      FROM FinancialMovement fm
      JOIN FinancialAccount fa ON fa.id=fm.accountId AND fa.tenantId=fm.tenantId
      WHERE fm.tenantId=${tenant.id} AND fm.contactId=${contactId}
      ORDER BY fm.occurredAt DESC LIMIT 150
    `),
  ]);

  return serialize({ contact, activity, communications, financialMovements, ownedPropertyIds: propertyIds });
}
