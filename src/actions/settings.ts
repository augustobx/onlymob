'use server';

import { revalidatePath } from 'next/cache';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction } from '@/lib/tenant-guard';
import { requirePermission } from '@/lib/permissions';
import { RENT_AUTO_GLOBAL_KEY } from '@/lib/rent-adjustment-engine';
import { z } from 'zod';

const SettingsSchema = z.object({
  name: z.string().min(2).max(160),
  receiptHeader: z.string().min(2).max(255),
  address: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  cuit: z.string().max(30).optional(),
  massSend: z.boolean().default(false),
  autoRentAdjustments: z.boolean().default(false),
});

export async function saveTenantSettingsAction(input: z.input<typeof SettingsSchema>) {
  const { tenant, session } = await requirePermission('settings', 'manage');
  const data = SettingsSchema.parse(input);

  await platformPrisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenant.id },
      data: {
        name: data.name.trim(),
        receiptHeader: data.receiptHeader.trim(),
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        cuit: data.cuit?.trim() || null,
      },
    });
    await Promise.all([
      tx.tenantSetting.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key: 'notifications.massSend' } },
        update: { value: data.massSend ? 'true' : 'false' },
        create: { tenantId: tenant.id, key: 'notifications.massSend', value: data.massSend ? 'true' : 'false' },
      }),
      tx.tenantSetting.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key: RENT_AUTO_GLOBAL_KEY } },
        update: { value: data.autoRentAdjustments ? 'true' : 'false' },
        create: { tenantId: tenant.id, key: RENT_AUTO_GLOBAL_KEY, value: data.autoRentAdjustments ? 'true' : 'false' },
      }),
    ]);
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'TENANT_SETTINGS_UPDATED',
    entityType: 'Tenant',
    entityId: tenant.id,
    metadata: {
      notificationsMassSend: data.massSend,
      automaticRentAdjustments: data.autoRentAdjustments,
    },
  });
  revalidatePath('/ajustes');
  revalidatePath('/aumentos');
  revalidatePath('/dashboard');
  return { success: true };
}
