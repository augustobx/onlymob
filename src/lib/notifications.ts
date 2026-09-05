import 'server-only';

import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';

export type NotificationChannel = 'INTERNAL' | 'EMAIL' | 'WHATSAPP' | 'PUSH';
export type NotificationAudience = 'TENANT' | 'USER' | 'RENTER' | 'OWNER';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export type NotificationRecord = {
  id: string;
  tenantId: string;
  eventKey: string;
  channel: NotificationChannel;
  audienceType: NotificationAudience;
  recipientRefId: string | null;
  recipientAddress: string | null;
  title: string;
  body: string;
  metadata: string | null;
  status: NotificationStatus;
  dedupeKey: string;
  scheduledFor: Date | null;
  sentAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
  failureMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationInput = {
  tenantId: string;
  eventKey: string;
  title: string;
  body: string;
  dedupeKey: string;
  audienceType?: NotificationAudience;
  recipientRefId?: string | null;
  recipientAddress?: string | null;
  metadata?: Record<string, unknown> | null;
  scheduledFor?: Date | null;
  channels?: NotificationChannel[];
};

const externalProviderEnabled: Partial<Record<NotificationChannel, () => boolean>> = {
  EMAIL: () => Boolean(process.env.NOTIFICATION_EMAIL_PROVIDER),
  WHATSAPP: () => Boolean(process.env.NOTIFICATION_WHATSAPP_PROVIDER),
  PUSH: () => Boolean(process.env.NOTIFICATION_PUSH_PROVIDER),
};

function channelStatus(channel: NotificationChannel): NotificationStatus {
  if (channel === 'INTERNAL') return 'SENT';
  return externalProviderEnabled[channel]?.() ? 'PENDING' : 'SKIPPED';
}

export async function createNotification(input: NotificationInput) {
  const channels = [...new Set(input.channels?.length ? input.channels : ['INTERNAL'])];
  let created = 0;

  for (const channel of channels) {
    const status = channelStatus(channel);
    const now = new Date();
    const failureMessage = status === 'SKIPPED' ? 'Provider no configurado para este canal.' : null;
    const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

    const inserted = await platformPrisma.$executeRaw(Prisma.sql`
      INSERT IGNORE INTO NotificationLog (
        id, tenantId, eventKey, channel, audienceType, recipientRefId, recipientAddress,
        title, body, metadata, status, dedupeKey, scheduledFor, sentAt, failedAt, failureMessage,
        createdAt, updatedAt
      ) VALUES (
        ${randomUUID()}, ${input.tenantId}, ${input.eventKey}, ${channel}, ${input.audienceType || 'TENANT'},
        ${input.recipientRefId || null}, ${input.recipientAddress || null}, ${input.title}, ${input.body},
        ${metadata}, ${status}, ${input.dedupeKey}, ${input.scheduledFor || null},
        ${status === 'SENT' ? now : null}, ${status === 'FAILED' ? now : null}, ${failureMessage}, ${now}, ${now}
      )
    `);

    created += Number(inserted || 0);
  }

  return { created };
}

export async function listInternalNotifications(input: {
  tenantId: string;
  userId?: string | null;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const limit = Math.max(1, Math.min(input.limit || 50, 100));
  const audienceFilter = input.userId
    ? Prisma.sql`(audienceType = 'TENANT' OR (audienceType = 'USER' AND recipientRefId = ${input.userId}))`
    : Prisma.sql`audienceType = 'TENANT'`;
  const unreadFilter = input.unreadOnly ? Prisma.sql`AND readAt IS NULL` : Prisma.empty;

  return platformPrisma.$queryRaw<NotificationRecord[]>(Prisma.sql`
    SELECT id, tenantId, eventKey, channel, audienceType, recipientRefId, recipientAddress,
           title, body, metadata, status, dedupeKey, scheduledFor, sentAt, readAt,
           failedAt, failureMessage, createdAt, updatedAt
    FROM NotificationLog
    WHERE tenantId = ${input.tenantId}
      AND channel = 'INTERNAL'
      AND status = 'SENT'
      AND ${audienceFilter}
      ${unreadFilter}
    ORDER BY createdAt DESC
    LIMIT ${limit}
  `);
}

export async function countUnreadInternalNotifications(tenantId: string, userId?: string | null) {
  const audienceFilter = userId
    ? Prisma.sql`(audienceType = 'TENANT' OR (audienceType = 'USER' AND recipientRefId = ${userId}))`
    : Prisma.sql`audienceType = 'TENANT'`;

  const rows = await platformPrisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
    SELECT COUNT(*) AS total
    FROM NotificationLog
    WHERE tenantId = ${tenantId}
      AND channel = 'INTERNAL'
      AND status = 'SENT'
      AND readAt IS NULL
      AND ${audienceFilter}
  `);

  return Number(rows[0]?.total || 0);
}

export async function markInternalNotificationRead(input: {
  tenantId: string;
  notificationId: string;
  userId?: string | null;
}) {
  const audienceFilter = input.userId
    ? Prisma.sql`(audienceType = 'TENANT' OR (audienceType = 'USER' AND recipientRefId = ${input.userId}))`
    : Prisma.sql`audienceType = 'TENANT'`;

  await platformPrisma.$executeRaw(Prisma.sql`
    UPDATE NotificationLog
    SET readAt = COALESCE(readAt, NOW(3)), updatedAt = NOW(3)
    WHERE id = ${input.notificationId}
      AND tenantId = ${input.tenantId}
      AND channel = 'INTERNAL'
      AND ${audienceFilter}
  `);
}

export async function markAllInternalNotificationsRead(tenantId: string, userId?: string | null) {
  const audienceFilter = userId
    ? Prisma.sql`(audienceType = 'TENANT' OR (audienceType = 'USER' AND recipientRefId = ${userId}))`
    : Prisma.sql`audienceType = 'TENANT'`;

  await platformPrisma.$executeRaw(Prisma.sql`
    UPDATE NotificationLog
    SET readAt = COALESCE(readAt, NOW(3)), updatedAt = NOW(3)
    WHERE tenantId = ${tenantId}
      AND channel = 'INTERNAL'
      AND readAt IS NULL
      AND ${audienceFilter}
  `);
}
