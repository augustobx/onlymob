'use server';

import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export async function getMaintenance360Action(maintenanceRequestId: string) {
  const { tenant } = await requirePermission('maintenance', 'read');

  const request = await platformPrisma.maintenanceRequest.findFirst({
    where: { id: maintenanceRequestId, tenantId: tenant.id },
    include: {
      property: {
        include: {
          agent: { select: { id: true, name: true, email: true } },
          owners: {
            include: { contact: true },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
      propertyLease: {
        include: {
          renter: true,
          guarantor: true,
          debts: { include: { payments: { orderBy: { paidAt: 'desc' } } }, orderBy: { dueDate: 'desc' } },
        },
      },
      renter: true,
      provider: { include: { providerProfile: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
      events: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      documents: { orderBy: { uploadedAt: 'desc' } },
      findings: {
        include: {
          inspection: {
            include: {
              inspector: { select: { id: true, name: true } },
              documents: { orderBy: { uploadedAt: 'desc' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!request) return null;

  const [activity, communications, financial] = await Promise.all([
    platformPrisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT a.id,a.eventKey,a.title,a.description,a.entityType,a.entityId,a.metadata,a.createdAt,
             u.name AS actorName
      FROM ActivityEvent a
      LEFT JOIN User u ON u.id=a.actorUserId AND u.tenantId=a.tenantId
      WHERE a.tenantId=${tenant.id}
        AND ((a.entityType='MaintenanceRequest' AND a.entityId=${request.id})
          OR (a.propertyId=${request.propertyId} AND a.eventKey LIKE 'maintenance.%'))
      ORDER BY a.createdAt DESC
      LIMIT 200
    `),
    platformPrisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT t.id,t.subject,t.status,t.lastMessageAt,t.updatedAt,COUNT(m.id) AS messageCount,
             MAX(CASE WHEN m.readAt IS NULL AND m.direction='INBOUND' THEN 1 ELSE 0 END) AS hasUnread
      FROM CommunicationThread t
      LEFT JOIN CommunicationMessage m ON m.threadId=t.id AND m.tenantId=t.tenantId
      WHERE t.tenantId=${tenant.id}
        AND (t.propertyId=${request.propertyId}${request.renterId ? Prisma.sql` OR t.renterId=${request.renterId}` : Prisma.empty})
      GROUP BY t.id,t.subject,t.status,t.lastMessageAt,t.updatedAt
      ORDER BY COALESCE(t.lastMessageAt,t.updatedAt) DESC
      LIMIT 80
    `),
    platformPrisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT fm.id,fm.type,fm.amount,fm.currency,fm.concept,fm.reference,fm.reconciliationStatus,fm.occurredAt,
             fa.name AS accountName
      FROM FinancialMovement fm
      JOIN FinancialAccount fa ON fa.id=fm.accountId AND fa.tenantId=fm.tenantId
      WHERE fm.tenantId=${tenant.id} AND fm.propertyId=${request.propertyId}
      ORDER BY fm.occurredAt DESC
      LIMIT 100
    `),
  ]);

  return serialize({ request, activity, communications, financial });
}
