'use server';

import { Prisma } from '@prisma/client';
import { requireTenantAdmin } from '@/lib/tenant-guard';
import { platformPrisma } from '@/lib/prisma-core';

type ScalarRow = {
  leadsTotal: bigint | number;
  leadsWon: bigint | number;
  avgFirstResponseMinutes: number | null;
  visitsTotal: bigint | number;
  reservationsTotal: bigint | number;
  dealsWon: bigint | number;
  avgDaysToClose: number | null;
};

type SourceRow = {
  source: string | null;
  leads: bigint | number;
  won: bigint | number;
  conversionRate: number | null;
};

type AgentRow = {
  id: string;
  name: string;
  leads: bigint | number;
  leadsWon: bigint | number;
  dealsWon: bigint | number;
  avgResponseMinutes: number | null;
};

type AdminRow = {
  propertiesTotal: bigint | number;
  propertiesOccupied: bigint | number;
  expectedMonthlyRent: number | null;
  collectedMonth: number | null;
  outstandingDebt: number | null;
  expiringLeases: bigint | number;
  upcomingAdjustments: bigint | number;
  pendingSettlements: bigint | number;
  pendingSettlementAmount: number | null;
};

type AgingRow = {
  bucket: string;
  count: bigint | number;
  amount: number | null;
};

type PropertyEconomicsRow = {
  propertyId: string;
  code: string;
  address: string;
  collected: number | null;
  expenses: number | null;
  maintenanceCost: number | null;
  netFlow: number | null;
};

type MaintenanceSummaryRow = {
  openCount: bigint | number;
  urgentCount: bigint | number;
  avgResolutionHours: number | null;
  totalCost90d: number | null;
  overdueTasks: bigint | number;
};

type ProviderCostRow = {
  providerId: string | null;
  providerName: string;
  requests: bigint | number;
  resolved: bigint | number;
  totalCost: number | null;
  avgCost: number | null;
};

type TeamRow = {
  userId: string;
  name: string;
  openTasks: bigint | number;
  completedTasks90d: bigint | number;
  openMaintenance: bigint | number;
  resolvedMaintenance90d: bigint | number;
};

function number(value: unknown) {
  return Number(value || 0);
}

export async function getAnalyticsAction(days = 90) {
  const { tenant } = await requireTenantAdmin();
  const safeDays = Math.max(30, Math.min(Number(days) || 90, 365));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [commercialRows, sourceRows, agentRows, adminRows, agingRows, propertyRows, maintenanceRows, providerRows, teamRows] = await Promise.all([
    platformPrisma.$queryRaw<ScalarRow[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM Lead l WHERE l.tenantId = ${tenant.id} AND l.createdAt >= ${since}) AS leadsTotal,
        (SELECT COUNT(*) FROM Lead l WHERE l.tenantId = ${tenant.id} AND l.createdAt >= ${since} AND l.status = 'WON') AS leadsWon,
        (SELECT AVG(TIMESTAMPDIFF(MINUTE, l.createdAt, l.firstResponseAt)) FROM Lead l WHERE l.tenantId = ${tenant.id} AND l.createdAt >= ${since} AND l.firstResponseAt IS NOT NULL) AS avgFirstResponseMinutes,
        (SELECT COUNT(*) FROM CalendarEvent e WHERE e.tenantId = ${tenant.id} AND e.type = 'VISIT' AND e.startsAt >= ${since}) AS visitsTotal,
        (SELECT COUNT(*) FROM Reservation r WHERE r.tenantId = ${tenant.id} AND r.createdAt >= ${since}) AS reservationsTotal,
        (SELECT COUNT(*) FROM Deal d WHERE d.tenantId = ${tenant.id} AND d.createdAt >= ${since} AND d.status = 'WON') AS dealsWon,
        (SELECT AVG(TIMESTAMPDIFF(DAY, d.createdAt, d.closedAt)) FROM Deal d WHERE d.tenantId = ${tenant.id} AND d.createdAt >= ${since} AND d.status = 'WON' AND d.closedAt IS NOT NULL) AS avgDaysToClose
    `),
    platformPrisma.$queryRaw<SourceRow[]>(Prisma.sql`
      SELECT
        COALESCE(NULLIF(TRIM(l.source), ''), 'Sin fuente') AS source,
        COUNT(*) AS leads,
        SUM(CASE WHEN l.status = 'WON' THEN 1 ELSE 0 END) AS won,
        ROUND(100 * SUM(CASE WHEN l.status = 'WON' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS conversionRate
      FROM Lead l
      WHERE l.tenantId = ${tenant.id} AND l.createdAt >= ${since}
      GROUP BY COALESCE(NULLIF(TRIM(l.source), ''), 'Sin fuente')
      ORDER BY leads DESC, source ASC
      LIMIT 12
    `),
    platformPrisma.$queryRaw<AgentRow[]>(Prisma.sql`
      SELECT
        u.id,
        u.name,
        COUNT(DISTINCT l.id) AS leads,
        COUNT(DISTINCT CASE WHEN l.status = 'WON' THEN l.id END) AS leadsWon,
        COUNT(DISTINCT CASE WHEN d.status = 'WON' THEN d.id END) AS dealsWon,
        AVG(CASE WHEN l.firstResponseAt IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, l.createdAt, l.firstResponseAt) END) AS avgResponseMinutes
      FROM User u
      LEFT JOIN Lead l ON l.agentId = u.id AND l.tenantId = u.tenantId AND l.createdAt >= ${since}
      LEFT JOIN Deal d ON d.agentId = u.id AND d.tenantId = u.tenantId AND d.createdAt >= ${since}
      WHERE u.tenantId = ${tenant.id} AND u.isActive = true
      GROUP BY u.id, u.name
      HAVING leads > 0 OR dealsWon > 0
      ORDER BY dealsWon DESC, leadsWon DESC, leads DESC
      LIMIT 20
    `),
    platformPrisma.$queryRaw<AdminRow[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM Property p WHERE p.tenantId = ${tenant.id} AND p.archivedAt IS NULL AND p.status <> 'ARCHIVADO') AS propertiesTotal,
        (SELECT COUNT(DISTINCT pl.propertyId) FROM PropertyLease pl WHERE pl.tenantId = ${tenant.id} AND pl.status IN ('CURRENT','EXPIRING')) AS propertiesOccupied,
        (SELECT COALESCE(SUM(pl.currentRent),0) FROM PropertyLease pl WHERE pl.tenantId = ${tenant.id} AND pl.status IN ('CURRENT','EXPIRING')) AS expectedMonthlyRent,
        (SELECT COALESCE(SUM(pay.amount),0) FROM Payment pay WHERE pay.tenantId = ${tenant.id} AND pay.paidAt >= ${monthStart}) AS collectedMonth,
        (SELECT COALESCE(SUM(d.amount - d.paidAmount),0) FROM Debt d WHERE d.tenantId = ${tenant.id} AND d.status IN ('PENDING','PARTIAL','OVERDUE')) AS outstandingDebt,
        (SELECT COUNT(*) FROM PropertyLease pl WHERE pl.tenantId = ${tenant.id} AND pl.status IN ('CURRENT','EXPIRING') AND pl.endDate BETWEEN ${today} AND DATE_ADD(${today}, INTERVAL 30 DAY)) AS expiringLeases,
        (SELECT COUNT(*) FROM PropertyLease pl WHERE pl.tenantId = ${tenant.id} AND pl.status IN ('CURRENT','EXPIRING') AND pl.nextAdjustmentDate BETWEEN ${today} AND DATE_ADD(${today}, INTERVAL 30 DAY)) AS upcomingAdjustments,
        (SELECT COUNT(*) FROM OwnerSettlement os WHERE os.tenantId = ${tenant.id} AND os.status IN ('DRAFT','READY')) AS pendingSettlements,
        (SELECT COALESCE(SUM(os.netAmount),0) FROM OwnerSettlement os WHERE os.tenantId = ${tenant.id} AND os.status IN ('DRAFT','READY')) AS pendingSettlementAmount
    `),
    platformPrisma.$queryRaw<AgingRow[]>(Prisma.sql`
      SELECT bucket, COUNT(*) AS count, COALESCE(SUM(balance),0) AS amount
      FROM (
        SELECT
          CASE
            WHEN DATEDIFF(${today}, d.dueDate) <= 30 THEN '1-30 días'
            WHEN DATEDIFF(${today}, d.dueDate) <= 60 THEN '31-60 días'
            WHEN DATEDIFF(${today}, d.dueDate) <= 90 THEN '61-90 días'
            ELSE '+90 días'
          END AS bucket,
          (d.amount - d.paidAmount) AS balance
        FROM Debt d
        WHERE d.tenantId = ${tenant.id}
          AND d.status IN ('PENDING','PARTIAL','OVERDUE')
          AND d.dueDate < ${today}
          AND d.amount > d.paidAmount
      ) aging
      GROUP BY bucket
      ORDER BY FIELD(bucket, '1-30 días','31-60 días','61-90 días','+90 días')
    `),
    platformPrisma.$queryRaw<PropertyEconomicsRow[]>(Prisma.sql`
      SELECT
        p.id AS propertyId,
        p.code,
        p.address,
        COALESCE(payments.collected, 0) AS collected,
        COALESCE(expenses.expenses, 0) AS expenses,
        COALESCE(maintenance.maintenanceCost, 0) AS maintenanceCost,
        COALESCE(payments.collected, 0) - COALESCE(expenses.expenses, 0) - COALESCE(maintenance.maintenanceCost, 0) AS netFlow
      FROM Property p
      LEFT JOIN (
        SELECT pl.propertyId, SUM(pay.amount) AS collected
        FROM Payment pay
        JOIN Debt d ON d.id = pay.debtId AND d.tenantId = pay.tenantId
        JOIN PropertyLease pl ON pl.id = d.propertyLeaseId AND pl.tenantId = d.tenantId
        WHERE pay.tenantId = ${tenant.id} AND pay.paidAt >= ${since}
        GROUP BY pl.propertyId
      ) payments ON payments.propertyId = p.id
      LEFT JOIN (
        SELECT pe.propertyId, SUM(pe.amount) AS expenses
        FROM PropertyExpense pe
        WHERE pe.tenantId = ${tenant.id} AND COALESCE(pe.paidAt, pe.createdAt) >= ${since}
        GROUP BY pe.propertyId
      ) expenses ON expenses.propertyId = p.id
      LEFT JOIN (
        SELECT mr.propertyId, SUM(COALESCE(mr.actualCost, mr.approvedAmount, mr.quotedAmount, 0)) AS maintenanceCost
        FROM MaintenanceRequest mr
        WHERE mr.tenantId = ${tenant.id} AND mr.createdAt >= ${since}
        GROUP BY mr.propertyId
      ) maintenance ON maintenance.propertyId = p.id
      WHERE p.tenantId = ${tenant.id} AND p.archivedAt IS NULL
        AND (payments.collected IS NOT NULL OR expenses.expenses IS NOT NULL OR maintenance.maintenanceCost IS NOT NULL)
      ORDER BY netFlow DESC
      LIMIT 30
    `),
    platformPrisma.$queryRaw<MaintenanceSummaryRow[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM MaintenanceRequest mr WHERE mr.tenantId = ${tenant.id} AND mr.status NOT IN ('RESOLVED','CANCELED')) AS openCount,
        (SELECT COUNT(*) FROM MaintenanceRequest mr WHERE mr.tenantId = ${tenant.id} AND mr.priority = 'URGENT' AND mr.status NOT IN ('RESOLVED','CANCELED')) AS urgentCount,
        (SELECT AVG(TIMESTAMPDIFF(HOUR, mr.createdAt, mr.resolvedAt)) FROM MaintenanceRequest mr WHERE mr.tenantId = ${tenant.id} AND mr.resolvedAt >= ${since}) AS avgResolutionHours,
        (SELECT COALESCE(SUM(COALESCE(mr.actualCost, mr.approvedAmount, mr.quotedAmount,0)),0) FROM MaintenanceRequest mr WHERE mr.tenantId = ${tenant.id} AND mr.createdAt >= ${since}) AS totalCost90d,
        (SELECT COUNT(*) FROM Task t WHERE t.tenantId = ${tenant.id} AND t.status = 'OPEN' AND t.dueAt < NOW()) AS overdueTasks
    `),
    platformPrisma.$queryRaw<ProviderCostRow[]>(Prisma.sql`
      SELECT
        mr.providerContactId AS providerId,
        COALESCE(CONCAT(c.firstName, ' ', c.lastName), 'Sin proveedor') AS providerName,
        COUNT(*) AS requests,
        SUM(CASE WHEN mr.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved,
        COALESCE(SUM(COALESCE(mr.actualCost, mr.approvedAmount, mr.quotedAmount,0)),0) AS totalCost,
        AVG(NULLIF(COALESCE(mr.actualCost, mr.approvedAmount, mr.quotedAmount,0),0)) AS avgCost
      FROM MaintenanceRequest mr
      LEFT JOIN Contact c ON c.id = mr.providerContactId AND c.tenantId = mr.tenantId
      WHERE mr.tenantId = ${tenant.id} AND mr.createdAt >= ${since}
      GROUP BY mr.providerContactId, c.firstName, c.lastName
      ORDER BY totalCost DESC, requests DESC
      LIMIT 15
    `),
    platformPrisma.$queryRaw<TeamRow[]>(Prisma.sql`
      SELECT
        u.id AS userId,
        u.name,
        COUNT(DISTINCT CASE WHEN t.status = 'OPEN' THEN t.id END) AS openTasks,
        COUNT(DISTINCT CASE WHEN t.status = 'DONE' AND t.completedAt >= ${since} THEN t.id END) AS completedTasks90d,
        COUNT(DISTINCT CASE WHEN mr.status NOT IN ('RESOLVED','CANCELED') THEN mr.id END) AS openMaintenance,
        COUNT(DISTINCT CASE WHEN mr.status = 'RESOLVED' AND mr.resolvedAt >= ${since} THEN mr.id END) AS resolvedMaintenance90d
      FROM User u
      LEFT JOIN Task t ON t.assignedUserId = u.id AND t.tenantId = u.tenantId
      LEFT JOIN MaintenanceRequest mr ON mr.assignedUserId = u.id AND mr.tenantId = u.tenantId
      WHERE u.tenantId = ${tenant.id} AND u.isActive = true
      GROUP BY u.id, u.name
      HAVING openTasks > 0 OR completedTasks90d > 0 OR openMaintenance > 0 OR resolvedMaintenance90d > 0
      ORDER BY completedTasks90d DESC, resolvedMaintenance90d DESC, u.name ASC
      LIMIT 20
    `),
  ]);

  const commercial = commercialRows[0] || ({ leadsTotal: 0, leadsWon: 0, avgFirstResponseMinutes: null, visitsTotal: 0, reservationsTotal: 0, dealsWon: 0, avgDaysToClose: null } as ScalarRow);
  const admin = adminRows[0] || ({ propertiesTotal: 0, propertiesOccupied: 0, expectedMonthlyRent: 0, collectedMonth: 0, outstandingDebt: 0, expiringLeases: 0, upcomingAdjustments: 0, pendingSettlements: 0, pendingSettlementAmount: 0 } as AdminRow);
  const maintenance = maintenanceRows[0] || ({ openCount: 0, urgentCount: 0, avgResolutionHours: null, totalCost90d: 0, overdueTasks: 0 } as MaintenanceSummaryRow);

  return {
    periodDays: safeDays,
    generatedAt: new Date().toISOString(),
    commercial: {
      leadsTotal: number(commercial.leadsTotal),
      leadsWon: number(commercial.leadsWon),
      conversionRate: number(commercial.leadsTotal) ? (number(commercial.leadsWon) / number(commercial.leadsTotal)) * 100 : 0,
      avgFirstResponseMinutes: commercial.avgFirstResponseMinutes == null ? null : number(commercial.avgFirstResponseMinutes),
      visitsTotal: number(commercial.visitsTotal),
      reservationsTotal: number(commercial.reservationsTotal),
      dealsWon: number(commercial.dealsWon),
      avgDaysToClose: commercial.avgDaysToClose == null ? null : number(commercial.avgDaysToClose),
    },
    leadsBySource: sourceRows.map((row) => ({ source: row.source || 'Sin fuente', leads: number(row.leads), won: number(row.won), conversionRate: number(row.conversionRate) })),
    agents: agentRows.map((row) => ({ id: row.id, name: row.name, leads: number(row.leads), leadsWon: number(row.leadsWon), dealsWon: number(row.dealsWon), avgResponseMinutes: row.avgResponseMinutes == null ? null : number(row.avgResponseMinutes) })),
    administration: {
      propertiesTotal: number(admin.propertiesTotal),
      propertiesOccupied: number(admin.propertiesOccupied),
      occupancyRate: number(admin.propertiesTotal) ? (number(admin.propertiesOccupied) / number(admin.propertiesTotal)) * 100 : 0,
      expectedMonthlyRent: number(admin.expectedMonthlyRent),
      collectedMonth: number(admin.collectedMonth),
      outstandingDebt: number(admin.outstandingDebt),
      expiringLeases: number(admin.expiringLeases),
      upcomingAdjustments: number(admin.upcomingAdjustments),
      pendingSettlements: number(admin.pendingSettlements),
      pendingSettlementAmount: number(admin.pendingSettlementAmount),
    },
    aging: agingRows.map((row) => ({ bucket: row.bucket, count: number(row.count), amount: number(row.amount) })),
    propertyEconomics: propertyRows.map((row) => ({ propertyId: row.propertyId, code: row.code, address: row.address, collected: number(row.collected), expenses: number(row.expenses), maintenanceCost: number(row.maintenanceCost), netFlow: number(row.netFlow) })),
    maintenance: {
      openCount: number(maintenance.openCount),
      urgentCount: number(maintenance.urgentCount),
      avgResolutionHours: maintenance.avgResolutionHours == null ? null : number(maintenance.avgResolutionHours),
      totalCost: number(maintenance.totalCost90d),
      overdueTasks: number(maintenance.overdueTasks),
    },
    providers: providerRows.map((row) => ({ providerId: row.providerId, providerName: row.providerName, requests: number(row.requests), resolved: number(row.resolved), totalCost: number(row.totalCost), avgCost: row.avgCost == null ? null : number(row.avgCost) })),
    team: teamRows.map((row) => ({ userId: row.userId, name: row.name, openTasks: number(row.openTasks), completedTasks: number(row.completedTasks90d), openMaintenance: number(row.openMaintenance), resolvedMaintenance: number(row.resolvedMaintenance90d) })),
  };
}
