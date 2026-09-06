import 'server-only';

import { platformPrisma } from '@/lib/prisma-core';
import { getOfficialICLSeries } from '@/lib/bcra';

export const RENT_AUTO_GLOBAL_KEY = 'rentAdjustments.autoApply';
export const RENT_AUTO_LEASE_PREFIX = 'rentAdjustments.autoLease:';

export type ScheduledAdjustmentPreview = {
  leaseId: string;
  propertyId: string;
  propertyCode: string;
  propertyAddress: string;
  renterId: string;
  renterName: string;
  adjustmentMethod: string;
  dueDate: string;
  updatePeriodMonths: number;
  oldRent: number;
  newRent: number | null;
  percent: number | null;
  indexUsed: string | null;
  nextAdjustmentDate: string | null;
  canApply: boolean;
  reason: string | null;
};

type PreviewInput = {
  tenantId: string;
  leaseIds: string[];
  manualPercent?: number | null;
  asOf?: Date;
};

function atNoon(value: Date) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  return date;
}

function isoDate(value: Date) {
  return atNoon(value).toISOString().slice(0, 10);
}

function addMonthsClamped(value: Date, months: number) {
  const source = atNoon(value);
  const targetYear = source.getFullYear();
  const targetMonth = source.getMonth() + months;
  const lastDay = new Date(targetYear, targetMonth + 1, 0, 12, 0, 0, 0).getDate();
  return new Date(targetYear, targetMonth, Math.min(source.getDate(), lastDay), 12, 0, 0, 0);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function findIclAtOrBefore(rows: Array<{ fecha: string; valor: number }>, value: Date) {
  const target = isoDate(value);
  return rows.filter((row) => row.fecha <= target).at(-1) || null;
}

export function leaseAutoSettingKey(leaseId: string) {
  return `${RENT_AUTO_LEASE_PREFIX}${leaseId}`;
}

export async function getAutomaticAdjustmentSettings(tenantId: string, leaseIds?: string[]) {
  const [globalSetting, leaseSettings] = await Promise.all([
    platformPrisma.tenantSetting.findUnique({
      where: { tenantId_key: { tenantId, key: RENT_AUTO_GLOBAL_KEY } },
    }),
    platformPrisma.tenantSetting.findMany({
      where: {
        tenantId,
        key: {
          in: leaseIds?.length
            ? leaseIds.map(leaseAutoSettingKey)
            : undefined,
          startsWith: leaseIds?.length ? undefined : RENT_AUTO_LEASE_PREFIX,
        },
      },
      select: { key: true, value: true },
    }),
  ]);

  const enabledLeaseIds = new Set(
    leaseSettings
      .filter((setting) => setting.value === 'true' && setting.key.startsWith(RENT_AUTO_LEASE_PREFIX))
      .map((setting) => setting.key.slice(RENT_AUTO_LEASE_PREFIX.length)),
  );

  return {
    globalEnabled: globalSetting?.value === 'true',
    enabledLeaseIds,
  };
}

export async function previewScheduledRentAdjustments(input: PreviewInput): Promise<ScheduledAdjustmentPreview[]> {
  const leaseIds = [...new Set(input.leaseIds.filter(Boolean))];
  if (!leaseIds.length) return [];

  const asOf = atNoon(input.asOf || new Date());
  const leases = await platformPrisma.propertyLease.findMany({
    where: {
      tenantId: input.tenantId,
      id: { in: leaseIds },
      status: { in: ['CURRENT', 'EXPIRING'] },
    },
    select: {
      id: true,
      propertyId: true,
      renterId: true,
      startDate: true,
      currentRent: true,
      increasePercent: true,
      adjustmentMethod: true,
      adjustmentIndex: true,
      nextAdjustmentDate: true,
      updatePeriodMonths: true,
      property: { select: { code: true, address: true } },
      renter: { select: { firstName: true, lastName: true } },
      rentHistory: {
        select: { changeDate: true },
        orderBy: { changeDate: 'desc' },
        take: 1,
      },
    },
  });

  const leaseMap = new Map(leases.map((lease) => [lease.id, lease]));
  const metadata = leases.map((lease) => {
    const period = Math.max(1, Number(lease.updatePeriodMonths || 4));
    const baseDate = atNoon(lease.rentHistory[0]?.changeDate || lease.startDate);
    const dueDate = atNoon(lease.nextAdjustmentDate || addMonthsClamped(baseDate, period));
    return { lease, baseDate, dueDate, period };
  });

  const readyIcl = metadata.filter(({ lease, dueDate }) => lease.adjustmentMethod === 'ICL' && dueDate <= asOf);
  let iclRows: Array<{ fecha: string; valor: number }> = [];
  if (readyIcl.length) {
    const earliestBase = readyIcl.reduce((min, item) => item.baseDate < min ? item.baseDate : min, readyIcl[0].baseDate);
    iclRows = await getOfficialICLSeries(earliestBase, asOf);
  }

  const manualPercent = Number(input.manualPercent || 0);
  const manualPercentValid = Number.isFinite(manualPercent) && manualPercent > 0 && manualPercent <= 1000;

  return leaseIds.map((leaseId) => {
    const lease = leaseMap.get(leaseId);
    if (!lease) {
      return {
        leaseId,
        propertyId: '',
        propertyCode: '—',
        propertyAddress: '',
        renterId: '',
        renterName: 'Contrato no disponible',
        adjustmentMethod: 'UNKNOWN',
        dueDate: '',
        updatePeriodMonths: 0,
        oldRent: 0,
        newRent: null,
        percent: null,
        indexUsed: null,
        nextAdjustmentDate: null,
        canApply: false,
        reason: 'El contrato no existe, no pertenece al tenant o ya no está vigente.',
      };
    }

    const item = metadata.find((entry) => entry.lease.id === lease.id)!;
    const oldRent = Number(lease.currentRent);
    const base = {
      leaseId: lease.id,
      propertyId: lease.propertyId,
      propertyCode: lease.property.code,
      propertyAddress: lease.property.address,
      renterId: lease.renterId,
      renterName: `${lease.renter.firstName} ${lease.renter.lastName}`.trim(),
      adjustmentMethod: lease.adjustmentMethod,
      dueDate: item.dueDate.toISOString(),
      updatePeriodMonths: item.period,
      oldRent,
    };

    if (item.dueDate > asOf) {
      return {
        ...base,
        newRent: null,
        percent: null,
        indexUsed: null,
        nextAdjustmentDate: null,
        canApply: false,
        reason: `Todavía no corresponde: vence el ${item.dueDate.toLocaleDateString('es-AR')}.`,
      };
    }

    if (lease.adjustmentMethod === 'ICL') {
      const baseIcl = findIclAtOrBefore(iclRows, item.baseDate);
      const targetIcl = findIclAtOrBefore(iclRows, item.dueDate);
      if (!baseIcl || !targetIcl || baseIcl.valor <= 0 || targetIcl.valor <= 0) {
        return {
          ...base,
          newRent: null,
          percent: null,
          indexUsed: null,
          nextAdjustmentDate: null,
          canApply: false,
          reason: 'No se pudo obtener el ICL oficial necesario del BCRA.',
        };
      }

      const factor = targetIcl.valor / baseIcl.valor;
      const newRent = roundMoney(oldRent * factor);
      const percent = roundPercent((factor - 1) * 100);
      if (!Number.isFinite(newRent) || newRent <= oldRent || !Number.isFinite(percent)) {
        return {
          ...base,
          newRent: null,
          percent: null,
          indexUsed: null,
          nextAdjustmentDate: null,
          canApply: false,
          reason: 'El cálculo ICL no produjo un alquiler superior al vigente.',
        };
      }

      return {
        ...base,
        newRent,
        percent,
        indexUsed: `ICL ${baseIcl.valor.toFixed(4)} → ${targetIcl.valor.toFixed(4)}`.slice(0, 50),
        nextAdjustmentDate: addMonthsClamped(item.dueDate, item.period).toISOString(),
        canApply: true,
        reason: null,
      };
    }

    const configuredPercent = lease.adjustmentMethod === 'FIXED_PERCENT'
      ? Number(lease.increasePercent || 0)
      : manualPercent;

    if (!Number.isFinite(configuredPercent) || configuredPercent <= 0 || configuredPercent > 1000) {
      const reason = lease.adjustmentMethod === 'FIXED_PERCENT'
        ? 'El contrato no tiene un porcentaje fijo válido configurado.'
        : 'Ingresá un porcentaje manual para este tipo de ajuste.';
      return {
        ...base,
        newRent: null,
        percent: null,
        indexUsed: null,
        nextAdjustmentDate: null,
        canApply: false,
        reason,
      };
    }

    if (lease.adjustmentMethod !== 'FIXED_PERCENT' && !manualPercentValid) {
      return {
        ...base,
        newRent: null,
        percent: null,
        indexUsed: null,
        nextAdjustmentDate: null,
        canApply: false,
        reason: 'Ingresá un porcentaje manual válido.',
      };
    }

    const newRent = roundMoney(oldRent * (1 + configuredPercent / 100));
    return {
      ...base,
      newRent,
      percent: roundPercent(configuredPercent),
      indexUsed: (
        lease.adjustmentMethod === 'FIXED_PERCENT'
          ? `Porcentaje fijo ${roundPercent(configuredPercent)}%`
          : lease.adjustmentIndex || `${lease.adjustmentMethod || 'Manual'} ${roundPercent(configuredPercent)}%`
      ).slice(0, 50),
      nextAdjustmentDate: addMonthsClamped(item.dueDate, item.period).toISOString(),
      canApply: true,
      reason: null,
    };
  });
}

export async function applyScheduledRentAdjustments(input: PreviewInput) {
  const preview = await previewScheduledRentAdjustments(input);
  const applicable = preview.filter((row) => row.canApply && row.newRent && row.percent != null && row.nextAdjustmentDate);

  if (applicable.length) {
    await platformPrisma.$transaction(async (tx) => {
      for (const row of applicable) {
        const current = await tx.propertyLease.findFirst({
          where: {
            id: row.leaseId,
            tenantId: input.tenantId,
            status: { in: ['CURRENT', 'EXPIRING'] },
          },
          select: { currentRent: true, nextAdjustmentDate: true },
        });
        if (!current) throw new Error(`El contrato ${row.propertyCode} dejó de estar vigente.`);
        if (Math.abs(Number(current.currentRent) - row.oldRent) > 0.009) {
          throw new Error(`El alquiler de ${row.propertyCode} cambió después de la simulación. Volvé a calcular.`);
        }

        const changeDate = atNoon(new Date(row.dueDate));
        await tx.rentHistory.create({
          data: {
            propertyLeaseId: row.leaseId,
            changeDate,
            oldRent: row.oldRent,
            newRent: row.newRent!,
            percent: row.percent!,
            indexUsed: row.indexUsed,
          },
        });
        await tx.propertyLease.update({
          where: { id: row.leaseId },
          data: {
            currentRent: row.newRent!,
            increasePercent: row.percent!,
            nextAdjustmentDate: new Date(row.nextAdjustmentDate!),
          },
        });
      }
    });
  }

  return {
    preview,
    applied: applicable,
    skipped: preview.filter((row) => !row.canApply),
  };
}
