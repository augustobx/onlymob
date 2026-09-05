'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import {
  countUnreadInternalNotifications,
  listInternalNotifications,
  markAllInternalNotificationsRead,
  markInternalNotificationRead,
} from '@/lib/notifications';

export async function getNotificationsAction(limit = 60) {
  const { tenant, session } = await requirePermission('notifications', 'read');
  const [notifications, unreadCount] = await Promise.all([
    listInternalNotifications({ tenantId: tenant.id, userId: session.userId, limit }),
    countUnreadInternalNotifications(tenant.id, session.userId),
  ]);

  return { notifications, unreadCount };
}

export async function markNotificationReadAction(formData: FormData) {
  const { tenant, session } = await requirePermission('notifications', 'update');
  const notificationId = String(formData.get('notificationId') || '');
  if (!notificationId) return;

  await markInternalNotificationRead({
    tenantId: tenant.id,
    notificationId,
    userId: session.userId,
  });

  revalidatePath('/notificaciones');
}

export async function markAllNotificationsReadAction() {
  const { tenant, session } = await requirePermission('notifications', 'update');
  await markAllInternalNotificationsRead(tenant.id, session.userId);
  revalidatePath('/notificaciones');
}
