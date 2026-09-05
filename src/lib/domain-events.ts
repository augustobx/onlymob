import 'server-only';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { queueWebhookEvent } from '@/lib/integrations';

export type DomainActivityInput = {
  tenantId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

type EventDescriptor = { eventKey: string; title: string; description?: string };

const ACTION_EVENTS: Record<string, EventDescriptor> = {
  PROPERTY_CREATED: { eventKey: 'property.created', title: 'Propiedad creada' },
  PROPERTY_UPDATED: { eventKey: 'property.updated', title: 'Propiedad actualizada' },
  PROPERTY_ARCHIVED: { eventKey: 'property.updated', title: 'Propiedad archivada' },
  LEAD_CREATED: { eventKey: 'lead.created', title: 'Lead creado' },
  LEAD_UPDATED: { eventKey: 'lead.updated', title: 'Lead actualizado' },
  LEAD_STATUS_CHANGED: { eventKey: 'lead.updated', title: 'Estado del lead actualizado' },
  INTERACTION_CREATED: { eventKey: 'lead.updated', title: 'Interacción comercial registrada' },
  CALENDAR_EVENT_CREATED: { eventKey: 'visit.created', title: 'Evento/visita agendada' },
  CALENDAR_EVENT_UPDATED: { eventKey: 'visit.created', title: 'Evento/visita actualizada' },
  PUBLICATION_SAVED: { eventKey: 'property.updated', title: 'Publicación actualizada' },
  RESERVATION_CREATED: { eventKey: 'reservation.created', title: 'Reserva creada' },
  RESERVATION_UPDATED: { eventKey: 'reservation.updated', title: 'Reserva actualizada' },
  RESERVATION_STATUS_CHANGED: { eventKey: 'reservation.updated', title: 'Estado de reserva actualizado' },
  RESERVATION_CONVERTED_TO_DEAL: { eventKey: 'deal.created', title: 'Reserva convertida en operación' },
  DEAL_CREATED: { eventKey: 'deal.created', title: 'Operación creada' },
  DEAL_UPDATED: { eventKey: 'deal.created', title: 'Operación actualizada' },
  DEAL_STATUS_CHANGED: { eventKey: 'deal.won', title: 'Estado de operación actualizado' },
  PROPERTY_LEASE_CREATED: { eventKey: 'lease.created', title: 'Contrato creado' },
  PROPERTY_LEASE_UPDATED: { eventKey: 'lease.updated', title: 'Contrato actualizado' },
  LEASE_CREATED: { eventKey: 'lease.created', title: 'Contrato creado' },
  LEASE_UPDATED: { eventKey: 'lease.updated', title: 'Contrato actualizado' },
  DEBT_CREATED: { eventKey: 'debt.created', title: 'Cargo generado' },
  PAYMENT_REGISTERED: { eventKey: 'payment.registered', title: 'Pago registrado' },
  PAYMENT_CREATED: { eventKey: 'payment.registered', title: 'Pago registrado' },
  MAINTENANCE_CREATED: { eventKey: 'maintenance.created', title: 'Solicitud de mantenimiento creada' },
  MAINTENANCE_REQUEST_CREATED: { eventKey: 'maintenance.created', title: 'Solicitud de mantenimiento creada' },
  MAINTENANCE_UPDATED: { eventKey: 'maintenance.updated', title: 'Mantenimiento actualizado' },
  MAINTENANCE_STATUS_CHANGED: { eventKey: 'maintenance.updated', title: 'Estado de mantenimiento actualizado' },
  DOCUMENT_CREATED: { eventKey: 'document.created', title: 'Documento registrado' },
  DOCUMENT_GENERATED: { eventKey: 'document.created', title: 'Documento generado' },
  DOCUMENT_UPDATED: { eventKey: 'document.updated', title: 'Documento actualizado' },
  SETTLEMENT_CREATED: { eventKey: 'settlement.ready', title: 'Liquidación creada' },
  SETTLEMENT_STATUS_CHANGED: { eventKey: 'settlement.ready', title: 'Liquidación actualizada' },
  COMMUNICATION_SENT: { eventKey: 'communication.sent', title: 'Comunicación enviada' },
  FINANCIAL_MOVEMENT_CREATED: { eventKey: 'financial.movement.created', title: 'Movimiento financiero registrado' },
};

function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }

async function resolveLinks(input: DomainActivityInput) {
  const metadata = input.metadata || {};
  let propertyId = text(metadata.propertyId);
  let contactId = text(metadata.contactId);
  let renterId = text(metadata.renterId);
  const entityId = input.entityId || null;

  if (input.entityType === 'Property') propertyId ||= entityId;
  if (input.entityType === 'Contact') contactId ||= entityId;
  if (input.entityType === 'PropertyRenter') renterId ||= entityId;

  if ((!propertyId || !contactId || !renterId) && entityId) {
    if (input.entityType === 'Lead') {
      const row = await platformPrisma.lead.findFirst({ where: { id: entityId, tenantId: input.tenantId }, select: { contactId: true, propertyInterests: { take: 1, select: { propertyId: true } } } });
      contactId ||= row?.contactId || null;
      propertyId ||= row?.propertyInterests[0]?.propertyId || null;
    } else if (input.entityType === 'Reservation') {
      const row = await platformPrisma.reservation.findFirst({ where: { id: entityId, tenantId: input.tenantId }, select: { propertyId: true, contactId: true } });
      propertyId ||= row?.propertyId || null;
      contactId ||= row?.contactId || null;
    } else if (input.entityType === 'Deal') {
      const row = await platformPrisma.deal.findFirst({ where: { id: entityId, tenantId: input.tenantId }, select: { propertyId: true, contactId: true } });
      propertyId ||= row?.propertyId || null;
      contactId ||= row?.contactId || null;
    } else if (input.entityType === 'Publication') {
      const row = await platformPrisma.publication.findFirst({ where: { id: entityId, tenantId: input.tenantId }, select: { propertyId: true } });
      propertyId ||= row?.propertyId || null;
    } else if (input.entityType === 'PropertyLease') {
      const row = await platformPrisma.propertyLease.findFirst({ where: { id: entityId, tenantId: input.tenantId }, select: { propertyId: true, renterId: true } });
      propertyId ||= row?.propertyId || null;
      renterId ||= row?.renterId || null;
    } else if (input.entityType === 'Debt') {
      const row = await platformPrisma.debt.findFirst({ where: { id: entityId, tenantId: input.tenantId }, select: { renterId: true, propertyLease: { select: { propertyId: true } } } });
      renterId ||= row?.renterId || null;
      propertyId ||= row?.propertyLease?.propertyId || null;
    } else if (input.entityType === 'Payment') {
      const row = await platformPrisma.payment.findFirst({ where: { id: entityId, tenantId: input.tenantId }, select: { debt: { select: { renterId: true, propertyLease: { select: { propertyId: true } } } } } });
      renterId ||= row?.debt.renterId || null;
      propertyId ||= row?.debt.propertyLease?.propertyId || null;
    } else if (input.entityType === 'MaintenanceRequest') {
      const row = await platformPrisma.maintenanceRequest.findFirst({ where: { id: entityId, tenantId: input.tenantId }, select: { propertyId: true, renterId: true } });
      propertyId ||= row?.propertyId || null;
      renterId ||= row?.renterId || null;
    } else if (input.entityType === 'Document') {
      const rows = await platformPrisma.$queryRaw<Array<{ propertyId: string | null; renterId: string | null }>>(Prisma.sql`SELECT propertyId, renterId FROM Document WHERE id=${entityId} AND tenantId=${input.tenantId} LIMIT 1`);
      propertyId ||= rows[0]?.propertyId || null;
      renterId ||= rows[0]?.renterId || null;
    } else if (input.entityType === 'OwnerSettlement') {
      const row = await platformPrisma.ownerSettlement.findFirst({ where: { id: entityId, tenantId: input.tenantId }, select: { ownerContactId: true } });
      contactId ||= row?.ownerContactId || null;
    }
  }

  return { propertyId, contactId, renterId };
}

function fallbackDescriptor(input: DomainActivityInput): EventDescriptor {
  const clean = input.action.toLowerCase().replaceAll('_', '.');
  return { eventKey: `activity.${clean}`, title: input.action.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase()) };
}

export async function publishDomainActivity(input: DomainActivityInput) {
  const descriptor = ACTION_EVENTS[input.action] || fallbackDescriptor(input);
  const links = await resolveLinks(input);
  const id = randomUUID();
  const metadata = JSON.stringify(input.metadata || {});

  await platformPrisma.$executeRaw(Prisma.sql`
    INSERT INTO ActivityEvent (id,tenantId,eventKey,title,description,entityType,entityId,propertyId,contactId,renterId,actorUserId,metadata,createdAt)
    VALUES (${id},${input.tenantId},${descriptor.eventKey},${descriptor.title},${descriptor.description || null},${input.entityType},${input.entityId || null},${links.propertyId},${links.contactId},${links.renterId},${input.actorUserId || null},${metadata},${new Date()})
  `);

  const queued = await queueWebhookEvent(input.tenantId, descriptor.eventKey, {
    activityId: id, action: input.action, entityType: input.entityType, entityId: input.entityId || null,
    propertyId: links.propertyId, contactId: links.contactId, renterId: links.renterId, metadata: input.metadata || {},
  });
  if (queued.queued > 0) await platformPrisma.$executeRaw(Prisma.sql`UPDATE ActivityEvent SET webhookQueuedAt=${new Date()} WHERE id=${id}`);
  return { id, eventKey: descriptor.eventKey, ...links, webhooksQueued: queued.queued };
}
