import 'server-only';

import { platformPrisma } from '@/lib/prisma-core';
import { createNotification } from '@/lib/notifications';
import { isTenantFeatureEnabled } from '@/lib/saas';
import { auditTenantAction } from '@/lib/tenant-guard';
import { applyScheduledRentAdjustments, getAutomaticAdjustmentSettings } from '@/lib/rent-adjustment-engine';

function addDays(date: Date, days: number) { return new Date(date.getTime() + days * 24 * 60 * 60 * 1000); }
function addHours(date: Date, hours: number) { return new Date(date.getTime() + hours * 60 * 60 * 1000); }
function startOfLocalDay(date: Date) { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
function dateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function money(value: unknown) { return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(Number(value||0)); }

export async function runAutomationSweep(input: { tenantId?: string | null } = {}) {
  const now = new Date();
  const today = startOfLocalDay(now);
  const recentSince = addDays(now, -1);
  const tenants = await platformPrisma.tenant.findMany({
    where: { status: 'ACTIVE', ...(input.tenantId ? { id: input.tenantId } : {}) },
    select: { id: true, name: true },
  });

  const totals: Record<string, number> = {
    tenants: 0, skippedDisabled: 0, notifications: 0, leadNew: 0, leadNoResponse: 0, visitReminder: 0,
    leaseExpiring: 0, adjustmentUpcoming: 0, adjustmentApplied: 0, adjustmentSkipped: 0,
    quotaGenerated: 0, debtDueSoon: 0, debtOverdue: 0, paymentRegistered: 0, maintenanceUpdated: 0, settlementReady: 0,
  };

  async function emit(category: keyof typeof totals, notification: Parameters<typeof createNotification>[0]) {
    const result = await createNotification(notification);
    totals.notifications += result.created;
    totals[category] += result.created;
  }

  for (const tenant of tenants) {
    if (!(await isTenantFeatureEnabled(tenant.id, 'automation'))) {
      totals.skippedDisabled += 1;
      continue;
    }
    totals.tenants += 1;

    const autoSettings = await getAutomaticAdjustmentSettings(tenant.id);
    if (autoSettings.globalEnabled && autoSettings.enabledLeaseIds.size > 0) {
      const automaticLeases = await platformPrisma.propertyLease.findMany({
        where: {
          tenantId: tenant.id,
          id: { in: [...autoSettings.enabledLeaseIds] },
          status: { in: ['CURRENT', 'EXPIRING'] },
        },
        select: { id: true },
      });

      if (automaticLeases.length) {
        const automaticResult = await applyScheduledRentAdjustments({
          tenantId: tenant.id,
          leaseIds: automaticLeases.map((lease) => lease.id),
          asOf: now,
        });
        totals.adjustmentApplied += automaticResult.applied.length;
        totals.adjustmentSkipped += automaticResult.skipped.length;

        for (const row of automaticResult.applied) {
          await auditTenantAction({
            tenantId: tenant.id,
            action: 'LEASE_INCREASE_APPLIED',
            entityType: 'PropertyLease',
            entityId: row.leaseId,
            metadata: {
              propertyId: row.propertyId,
              adjustmentMethod: row.adjustmentMethod,
              oldRent: row.oldRent,
              newRent: row.newRent,
              percent: row.percent,
              indexUsed: row.indexUsed,
              nextAdjustmentDate: row.nextAdjustmentDate,
              source: 'automation',
            },
          });
          const notification = await createNotification({
            tenantId: tenant.id,
            eventKey: 'ADJUSTMENT_APPLIED',
            title: 'Aumento aplicado automáticamente',
            body: `${row.propertyCode} · ${row.renterName} · ${money(row.oldRent)} → ${money(row.newRent)} (${Number(row.percent || 0).toFixed(2)}%).`,
            dedupeKey: `adjustment-applied:${row.leaseId}:${dateKey(new Date(row.dueDate))}`,
            metadata: { leaseId: row.leaseId, propertyId: row.propertyId, oldRent: row.oldRent, newRent: row.newRent, percent: row.percent },
          });
          totals.notifications += notification.created;
        }
      }
    }

    const [newLeads, staleLeads, visits, expiringLeases, upcomingAdjustments, recentDebts, dueSoonDebts, overdueDebts, recentPayments, maintenanceEvents, readySettlements] = await Promise.all([
      platformPrisma.lead.findMany({ where:{tenantId:tenant.id,createdAt:{gte:recentSince}}, include:{contact:{select:{firstName:true,lastName:true}}} }),
      platformPrisma.lead.findMany({ where:{tenantId:tenant.id,status:{notIn:['WON','LOST']},firstResponseAt:null,createdAt:{lte:addHours(now,-4)}}, include:{contact:{select:{firstName:true,lastName:true}}} }),
      platformPrisma.calendarEvent.findMany({ where:{tenantId:tenant.id,type:'VISIT',status:'SCHEDULED',startsAt:{gte:now,lte:addDays(now,1)}}, include:{property:{select:{code:true,address:true}},contact:{select:{firstName:true,lastName:true}}} }),
      platformPrisma.propertyLease.findMany({ where:{tenantId:tenant.id,status:{in:['CURRENT','EXPIRING']},endDate:{gte:today,lte:addDays(today,30)}}, include:{property:{select:{code:true,address:true}},renter:{select:{firstName:true,lastName:true}}} }),
      platformPrisma.propertyLease.findMany({ where:{tenantId:tenant.id,status:{in:['CURRENT','EXPIRING']},nextAdjustmentDate:{gte:today,lte:addDays(today,15)}}, include:{property:{select:{code:true,address:true}},renter:{select:{firstName:true,lastName:true}}} }),
      platformPrisma.debt.findMany({ where:{tenantId:tenant.id,generatedAt:{gte:recentSince}}, include:{renter:{select:{firstName:true,lastName:true}}} }),
      platformPrisma.debt.findMany({ where:{tenantId:tenant.id,status:{in:['PENDING','PARTIAL']},dueDate:{gte:today,lte:addDays(today,5)}}, include:{renter:{select:{firstName:true,lastName:true}}} }),
      platformPrisma.debt.findMany({ where:{tenantId:tenant.id,status:{in:['PENDING','PARTIAL','OVERDUE']},dueDate:{lt:today}}, include:{renter:{select:{firstName:true,lastName:true}}} }),
      platformPrisma.payment.findMany({ where:{tenantId:tenant.id,createdAt:{gte:recentSince}}, include:{debt:{include:{renter:{select:{firstName:true,lastName:true}}}}} }),
      platformPrisma.maintenanceEvent.findMany({ where:{tenantId:tenant.id,createdAt:{gte:recentSince}}, include:{maintenanceRequest:{include:{property:{select:{code:true,address:true}}}}} }),
      platformPrisma.ownerSettlement.findMany({ where:{tenantId:tenant.id,status:'READY'}, include:{owner:{select:{firstName:true,lastName:true}}} }),
    ]);

    for (const lead of newLeads) await emit('leadNew',{tenantId:tenant.id,eventKey:'LEAD_NEW',audienceType:lead.agentId?'USER':'TENANT',recipientRefId:lead.agentId,title:'Nuevo lead',body:`${lead.contact.firstName} ${lead.contact.lastName}: ${lead.title}`,dedupeKey:`lead-new:${lead.id}`,metadata:{leadId:lead.id}});
    for (const lead of staleLeads) await emit('leadNoResponse',{tenantId:tenant.id,eventKey:'LEAD_NO_RESPONSE',audienceType:lead.agentId?'USER':'TENANT',recipientRefId:lead.agentId,title:'Lead sin primera respuesta',body:`${lead.contact.firstName} ${lead.contact.lastName} lleva más de 4 horas sin primera respuesta.`,dedupeKey:`lead-no-response:${lead.id}:${dateKey(now)}`,metadata:{leadId:lead.id}});
    for (const visit of visits) {
      const property=visit.property?`${visit.property.code} · ${visit.property.address}`:'propiedad sin asignar';
      const contact=visit.contact?`${visit.contact.firstName} ${visit.contact.lastName}`:'contacto sin asignar';
      await emit('visitReminder',{tenantId:tenant.id,eventKey:'VISIT_REMINDER',audienceType:visit.agentId?'USER':'TENANT',recipientRefId:visit.agentId,title:'Visita próxima',body:`${visit.title} · ${property} · ${contact} · ${visit.startsAt.toLocaleString('es-AR')}`,dedupeKey:`visit-reminder:${visit.id}:${dateKey(visit.startsAt)}`,metadata:{eventId:visit.id,propertyId:visit.propertyId}});
    }
    for (const lease of expiringLeases) await emit('leaseExpiring',{tenantId:tenant.id,eventKey:'LEASE_EXPIRING',title:'Contrato próximo a vencer',body:`${lease.property.code} · ${lease.property.address} · ${lease.renter.firstName} ${lease.renter.lastName} vence el ${lease.endDate.toLocaleDateString('es-AR')}.`,dedupeKey:`lease-expiring:${lease.id}:${dateKey(lease.endDate)}`,metadata:{leaseId:lease.id,propertyId:lease.propertyId,renterId:lease.renterId}});
    for (const lease of upcomingAdjustments) if (lease.nextAdjustmentDate) await emit('adjustmentUpcoming',{tenantId:tenant.id,eventKey:'ADJUSTMENT_UPCOMING',title:'Ajuste de alquiler próximo',body:`${lease.property.code} · ${lease.renter.firstName} ${lease.renter.lastName} tiene ajuste el ${lease.nextAdjustmentDate.toLocaleDateString('es-AR')}.`,dedupeKey:`adjustment-upcoming:${lease.id}:${dateKey(lease.nextAdjustmentDate)}`,metadata:{leaseId:lease.id,adjustmentMethod:lease.adjustmentMethod,adjustmentIndex:lease.adjustmentIndex}});
    for (const debt of recentDebts) await emit('quotaGenerated',{tenantId:tenant.id,eventKey:'QUOTA_GENERATED',title:'Nuevo cargo generado',body:`${debt.description} · ${debt.renter.firstName} ${debt.renter.lastName} · ${money(debt.amount)}.`,dedupeKey:`quota-generated:${debt.id}`,metadata:{debtId:debt.id,renterId:debt.renterId,type:debt.type}});
    for (const debt of dueSoonDebts) await emit('debtDueSoon',{tenantId:tenant.id,eventKey:'DEBT_DUE_SOON',title:'Cuota próxima a vencer',body:`${debt.renter.firstName} ${debt.renter.lastName} · ${debt.description} vence el ${debt.dueDate.toLocaleDateString('es-AR')}.`,dedupeKey:`debt-due-soon:${debt.id}:${dateKey(debt.dueDate)}`,metadata:{debtId:debt.id,renterId:debt.renterId}});
    for (const debt of overdueDebts) await emit('debtOverdue',{tenantId:tenant.id,eventKey:'DEBT_OVERDUE',title:'Deuda vencida',body:`${debt.renter.firstName} ${debt.renter.lastName} · ${debt.description} · saldo ${money(Number(debt.amount)-Number(debt.paidAmount))}.`,dedupeKey:`debt-overdue:${debt.id}:${dateKey(now)}`,metadata:{debtId:debt.id,renterId:debt.renterId}});
    for (const payment of recentPayments) await emit('paymentRegistered',{tenantId:tenant.id,eventKey:'PAYMENT_REGISTERED',title:'Pago registrado',body:`${payment.debt.renter.firstName} ${payment.debt.renter.lastName} · ${money(payment.amount)} · ${payment.method}.`,dedupeKey:`payment-registered:${payment.id}`,metadata:{paymentId:payment.id,debtId:payment.debtId,renterId:payment.debt.renterId}});
    for (const event of maintenanceEvents) {
      const request=event.maintenanceRequest;
      await emit('maintenanceUpdated',{tenantId:tenant.id,eventKey:'MAINTENANCE_UPDATED',audienceType:request.assignedUserId?'USER':'TENANT',recipientRefId:request.assignedUserId,title:'Mantenimiento actualizado',body:`${request.property.code} · ${request.title}${event.toStatus?` → ${event.toStatus}`:''}.`,dedupeKey:`maintenance-updated:${event.id}`,metadata:{maintenanceRequestId:request.id,eventId:event.id,status:event.toStatus}});
    }
    for (const settlement of readySettlements) await emit('settlementReady',{tenantId:tenant.id,eventKey:'SETTLEMENT_READY',title:'Liquidación disponible',body:`${settlement.owner.firstName} ${settlement.owner.lastName} · neto ${money(settlement.netAmount)}.`,dedupeKey:`settlement-ready:${settlement.id}`,metadata:{settlementId:settlement.id,ownerContactId:settlement.ownerContactId}});
  }

  return totals;
}
