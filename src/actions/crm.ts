'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction, requireTenantAdmin } from '@/lib/tenant-guard';

const LEAD_STATUSES = ['NEW','CONTACTED','QUALIFIED','PROPERTIES_SENT','VISIT_SCHEDULED','VISITED','NEGOTIATION','RESERVATION','WON','LOST'] as const;
const LEAD_PRIORITIES = ['LOW','NORMAL','HIGH','URGENT'] as const;
const INTERACTION_TYPES = ['CALL','WHATSAPP','EMAIL','MEETING','NOTE','OTHER'] as const;
const OPERATIONS = ['RENT','SALE','TEMPORARY_RENT','MANAGEMENT'] as const;
const PROPERTY_TYPES = ['DEPARTAMENTO','CASA','LOCAL','TERRENO','OFICINA','COCHERA','OTRO'] as const;
const TASK_STATUSES = ['OPEN','IN_PROGRESS','DONE','CANCELED'] as const;
const TASK_PRIORITIES = ['LOW','NORMAL','HIGH','URGENT'] as const;
const EVENT_TYPES = ['VISIT','MEETING','CALL','OTHER'] as const;
const EVENT_STATUSES = ['SCHEDULED','COMPLETED','CANCELED','NO_SHOW'] as const;

function optionalDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('Fecha inválida.');
  return parsed;
}

async function assertUser(tenantId: string, userId?: string | null) {
  if (!userId) return null;
  const user = await platformPrisma.user.findFirst({ where: { id: userId, tenantId, isActive: true } });
  if (!user) throw new Error('Usuario/agente no pertenece a esta inmobiliaria.');
  return user;
}

async function assertLead(tenantId: string, leadId: string) {
  const lead = await platformPrisma.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) throw new Error('Lead no encontrado.');
  return lead;
}

const LeadSchema = z.object({
  contactId: z.string().min(1),
  agentId: z.string().optional().nullable(),
  title: z.string().min(2).max(180),
  source: z.string().max(100).optional().nullable(),
  channel: z.string().max(60).optional().nullable(),
  priority: z.enum(LEAD_PRIORITIES).default('NORMAL'),
  score: z.number().int().min(0).max(100).optional().nullable(),
  status: z.enum(LEAD_STATUSES).default('NEW'),
  notes: z.string().max(6000).optional().nullable(),
  nextStep: z.string().max(255).optional().nullable(),
  nextActionAt: z.string().optional().nullable(),
  lostReason: z.string().max(255).optional().nullable(),
});

export async function getCrmDataAction() {
  const { tenant } = await requireTenantAdmin();
  const [leads, contacts, users, properties, tasks, events] = await Promise.all([
    platformPrisma.lead.findMany({
      where: { tenantId: tenant.id },
      include: {
        contact: true,
        agent: { select: { id: true, name: true } },
        interactions: { orderBy: { occurredAt: 'desc' }, take: 5 },
        demands: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } },
        propertyInterests: { include: { property: true }, orderBy: { score: 'desc' }, take: 8 },
      },
      orderBy: [{ updatedAt: 'desc' }],
    }),
    platformPrisma.contact.findMany({
      where: { tenantId: tenant.id, archivedAt: null, isActive: true },
      include: { roles: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    platformPrisma.user.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    platformPrisma.property.findMany({
      where: { tenantId: tenant.id, archivedAt: null, status: { not: 'ARCHIVADO' } },
      select: { id: true, code: true, address: true, city: true, province: true, operation: true, type: true, commercialStatus: true, rentPrice: true, salePrice: true, currency: true, rooms: true, bedrooms: true, sqm: true },
      orderBy: { code: 'asc' },
    }),
    platformPrisma.task.findMany({
      where: { tenantId: tenant.id, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: { assignee: { select: { id: true, name: true } }, lead: { select: { id: true, title: true } } },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    }),
    platformPrisma.calendarEvent.findMany({
      where: { tenantId: tenant.id, status: 'SCHEDULED', startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      include: { agent: { select: { id: true, name: true } }, property: { select: { id: true, code: true, address: true } }, lead: { select: { id: true, title: true } } },
      orderBy: { startsAt: 'asc' },
      take: 50,
    }),
  ]);

  return {
    leads: leads.map((lead) => ({
      ...lead,
      demands: lead.demands.map((d) => ({ ...d, budgetMin: d.budgetMin ? Number(d.budgetMin) : null, budgetMax: d.budgetMax ? Number(d.budgetMax) : null, sqmMin: d.sqmMin ? Number(d.sqmMin) : null })),
      propertyInterests: lead.propertyInterests.map((i) => ({
        ...i,
        property: { ...i.property, rentPrice: i.property.rentPrice ? Number(i.property.rentPrice) : null, salePrice: i.property.salePrice ? Number(i.property.salePrice) : null, sqm: i.property.sqm ? Number(i.property.sqm) : null },
      })),
    })),
    contacts,
    users,
    properties: properties.map((p) => ({ ...p, rentPrice: p.rentPrice ? Number(p.rentPrice) : null, salePrice: p.salePrice ? Number(p.salePrice) : null, sqm: p.sqm ? Number(p.sqm) : null })),
    tasks,
    events,
  };
}

export async function saveLeadAction(data: z.input<typeof LeadSchema> & { id?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  const validated = LeadSchema.parse(data);
  const contact = await platformPrisma.contact.findFirst({ where: { id: validated.contactId, tenantId: tenant.id, archivedAt: null } });
  if (!contact) throw new Error('Contacto no encontrado.');
  await assertUser(tenant.id, validated.agentId);

  const lead = await platformPrisma.$transaction(async (tx) => {
    const payload = {
      contactId: contact.id,
      agentId: validated.agentId || null,
      title: validated.title.trim(),
      source: validated.source?.trim() || null,
      channel: validated.channel?.trim() || null,
      priority: validated.priority,
      score: validated.score ?? null,
      status: validated.status,
      notes: validated.notes?.trim() || null,
      nextStep: validated.nextStep?.trim() || null,
      nextActionAt: optionalDate(validated.nextActionAt),
      lostReason: validated.status === 'LOST' ? validated.lostReason?.trim() || null : null,
      closedAt: ['WON', 'LOST'].includes(validated.status) ? new Date() : null,
    } as const;

    let saved;
    if (data.id) {
      const existing = await tx.lead.findFirst({ where: { id: data.id, tenantId: tenant.id } });
      if (!existing) throw new Error('Lead no encontrado.');
      saved = await tx.lead.update({ where: { id: existing.id }, data: payload });
    } else {
      saved = await tx.lead.create({ data: { tenantId: tenant.id, ...payload } });
    }

    const prospectRole = await tx.contactRole.findUnique({ where: { contactId_role: { contactId: contact.id, role: 'PROSPECT' } } });
    if (!prospectRole) await tx.contactRole.create({ data: { contactId: contact.id, role: 'PROSPECT' } });
    return saved;
  });

  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: data.id ? 'LEAD_UPDATED' : 'LEAD_CREATED', entityType: 'Lead', entityId: lead.id });
  revalidatePath('/crm');
  revalidatePath('/dashboard');
  return { success: true, leadId: lead.id };
}

export async function moveLeadAction(leadId: string, status: typeof LEAD_STATUSES[number], lostReason?: string) {
  const { tenant, session } = await requireTenantAdmin();
  const current = await assertLead(tenant.id, leadId);
  const now = new Date();
  await platformPrisma.lead.update({
    where: { id: current.id },
    data: {
      status,
      firstResponseAt: current.firstResponseAt || (current.status === 'NEW' && status !== 'NEW' ? now : undefined),
      closedAt: ['WON', 'LOST'].includes(status) ? now : null,
      lostReason: status === 'LOST' ? lostReason?.trim() || 'Sin motivo informado' : null,
    },
  });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'LEAD_STATUS_CHANGED', entityType: 'Lead', entityId: leadId, metadata: { from: current.status, to: status } });
  revalidatePath('/crm');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function addLeadInteractionAction(data: { leadId: string; type: typeof INTERACTION_TYPES[number]; summary: string; nextStep?: string; occurredAt?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  const lead = await assertLead(tenant.id, data.leadId);
  if (!data.summary.trim()) throw new Error('Escribí un resumen de la interacción.');
  const occurredAt = optionalDate(data.occurredAt) || new Date();

  const interaction = await platformPrisma.$transaction(async (tx) => {
    const created = await tx.leadInteraction.create({ data: { tenantId: tenant.id, leadId: lead.id, userId: session.userId, type: data.type, summary: data.summary.trim(), nextStep: data.nextStep?.trim() || null, occurredAt } });
    await tx.lead.update({ where: { id: lead.id }, data: { lastInteractionAt: occurredAt, firstResponseAt: lead.firstResponseAt || occurredAt, status: lead.status === 'NEW' ? 'CONTACTED' : lead.status, nextStep: data.nextStep?.trim() || lead.nextStep } });
    return created;
  });

  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'LEAD_INTERACTION_CREATED', entityType: 'LeadInteraction', entityId: interaction.id, metadata: { leadId: lead.id, type: data.type } });
  revalidatePath('/crm');
  return { success: true, interactionId: interaction.id };
}

const DemandSchema = z.object({
  leadId: z.string().optional().nullable(),
  contactId: z.string().min(1),
  operation: z.enum(OPERATIONS),
  propertyType: z.enum(PROPERTY_TYPES).optional().nullable(),
  zones: z.array(z.string().min(1).max(100)).default([]),
  budgetMin: z.number().nonnegative().optional().nullable(),
  budgetMax: z.number().positive().optional().nullable(),
  currency: z.string().min(2).max(10).default('ARS'),
  roomsMin: z.number().int().nonnegative().optional().nullable(),
  bedroomsMin: z.number().int().nonnegative().optional().nullable(),
  sqmMin: z.number().nonnegative().optional().nullable(),
  amenities: z.array(z.string().min(1).max(80)).default([]),
  excludedConditions: z.string().max(4000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function saveDemandAction(data: z.input<typeof DemandSchema> & { id?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  const validated = DemandSchema.parse(data);
  if (validated.budgetMin != null && validated.budgetMax != null && validated.budgetMax < validated.budgetMin) throw new Error('El presupuesto máximo no puede ser menor al mínimo.');
  const contact = await platformPrisma.contact.findFirst({ where: { id: validated.contactId, tenantId: tenant.id, archivedAt: null } });
  if (!contact) throw new Error('Contacto no encontrado.');
  if (validated.leadId) await assertLead(tenant.id, validated.leadId);

  const payload = {
    leadId: validated.leadId || null,
    contactId: contact.id,
    operation: validated.operation,
    propertyType: validated.propertyType || null,
    zones: validated.zones,
    budgetMin: validated.budgetMin ?? null,
    budgetMax: validated.budgetMax ?? null,
    currency: validated.currency.toUpperCase(),
    roomsMin: validated.roomsMin ?? null,
    bedroomsMin: validated.bedroomsMin ?? null,
    sqmMin: validated.sqmMin ?? null,
    amenities: validated.amenities,
    excludedConditions: validated.excludedConditions?.trim() || null,
    notes: validated.notes?.trim() || null,
  };

  let demand;
  if (data.id) {
    const existing = await platformPrisma.demand.findFirst({ where: { id: data.id, tenantId: tenant.id } });
    if (!existing) throw new Error('Demanda no encontrada.');
    demand = await platformPrisma.demand.update({ where: { id: existing.id }, data: payload });
  } else {
    demand = await platformPrisma.demand.create({ data: { tenantId: tenant.id, ...payload } });
  }

  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: data.id ? 'DEMAND_UPDATED' : 'DEMAND_CREATED', entityType: 'Demand', entityId: demand.id });
  revalidatePath('/crm');
  return { success: true, demandId: demand.id };
}

export async function getDemandMatchesAction(demandId: string) {
  const { tenant } = await requireTenantAdmin();
  const demand = await platformPrisma.demand.findFirst({ where: { id: demandId, tenantId: tenant.id, status: 'ACTIVE' } });
  if (!demand) throw new Error('Demanda activa no encontrada.');

  const properties = await platformPrisma.property.findMany({
    where: { tenantId: tenant.id, archivedAt: null, operation: demand.operation, commercialStatus: { in: ['AVAILABLE', 'UNDER_NEGOTIATION'] }, status: { not: 'ARCHIVADO' } },
    orderBy: { updatedAt: 'desc' },
  });

  const zones = Array.isArray(demand.zones) ? demand.zones.map(String).map((z) => z.toLowerCase()) : [];
  const requiredAmenities = Array.isArray(demand.amenities) ? demand.amenities.map(String).map((a) => a.toLowerCase()) : [];

  return properties.map((property) => {
    let score = 20;
    const reasons: string[] = ['Operación compatible'];
    if (!demand.propertyType || property.type === demand.propertyType) { score += 15; reasons.push('Tipo compatible'); }
    if (zones.length === 0 || zones.some((z) => [property.city, property.province, property.address].filter(Boolean).some((v) => String(v).toLowerCase().includes(z)))) { score += 15; reasons.push('Zona compatible'); }
    const price = demand.operation === 'SALE' ? Number(property.salePrice || 0) : Number(property.rentPrice || property.baseRent || 0);
    if ((demand.budgetMin == null || price >= Number(demand.budgetMin)) && (demand.budgetMax == null || price <= Number(demand.budgetMax))) { score += 20; reasons.push('Presupuesto compatible'); }
    if (demand.roomsMin == null || (property.rooms ?? 0) >= demand.roomsMin) { score += 10; reasons.push('Ambientes'); }
    if (demand.bedroomsMin == null || (property.bedrooms ?? 0) >= demand.bedroomsMin) { score += 10; reasons.push('Dormitorios'); }
    if (demand.sqmMin == null || Number(property.sqm || 0) >= Number(demand.sqmMin)) { score += 5; reasons.push('Superficie'); }
    const propertyAmenities = Array.isArray(property.amenities) ? property.amenities.map(String).map((a) => a.toLowerCase()) : [];
    if (requiredAmenities.length === 0 || requiredAmenities.every((a) => propertyAmenities.some((p) => p.includes(a)))) { score += 5; reasons.push('Amenities'); }
    return { id: property.id, code: property.code, address: property.address, city: property.city, type: property.type, operation: property.operation, price, currency: property.currency, score: Math.min(score, 100), reasons };
  }).sort((a, b) => b.score - a.score).slice(0, 30);
}

export async function recordPropertyInterestAction(data: { leadId: string; propertyId: string; score: number; reasons?: string[]; status?: 'MATCHED' | 'SENT' | 'FAVORITE' | 'REJECTED'; notes?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  await assertLead(tenant.id, data.leadId);
  const property = await platformPrisma.property.findFirst({ where: { id: data.propertyId, tenantId: tenant.id, archivedAt: null } });
  if (!property) throw new Error('Propiedad no encontrada.');
  const status = data.status || 'MATCHED';
  const interest = await platformPrisma.leadPropertyInterest.upsert({
    where: { leadId_propertyId: { leadId: data.leadId, propertyId: property.id } },
    update: { score: Math.max(0, Math.min(100, Math.round(data.score))), matchReasons: data.reasons || [], status, sentAt: status === 'SENT' ? new Date() : undefined, notes: data.notes?.trim() || null },
    create: { tenantId: tenant.id, leadId: data.leadId, propertyId: property.id, score: Math.max(0, Math.min(100, Math.round(data.score))), matchReasons: data.reasons || [], status, sentAt: status === 'SENT' ? new Date() : null, notes: data.notes?.trim() || null },
  });
  if (status === 'SENT') await platformPrisma.lead.update({ where: { id: data.leadId }, data: { status: 'PROPERTIES_SENT' } });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'LEAD_PROPERTY_INTEREST_SAVED', entityType: 'LeadPropertyInterest', entityId: interest.id, metadata: { leadId: data.leadId, propertyId: property.id, status } });
  revalidatePath('/crm');
  return { success: true };
}

export async function getAgendaDataAction() {
  const { tenant } = await requireTenantAdmin();
  const [tasks, events, leads, contacts, properties, users] = await Promise.all([
    platformPrisma.task.findMany({ where: { tenantId: tenant.id }, include: { assignee: { select: { id: true, name: true } }, lead: { select: { id: true, title: true } }, contact: { select: { id: true, firstName: true, lastName: true } }, property: { select: { id: true, code: true, address: true } } }, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }] }),
    platformPrisma.calendarEvent.findMany({ where: { tenantId: tenant.id }, include: { agent: { select: { id: true, name: true } }, lead: { select: { id: true, title: true } }, contact: { select: { id: true, firstName: true, lastName: true } }, property: { select: { id: true, code: true, address: true } } }, orderBy: { startsAt: 'asc' }, take: 200 }),
    platformPrisma.lead.findMany({ where: { tenantId: tenant.id, status: { notIn: ['WON','LOST'] } }, select: { id: true, title: true }, orderBy: { updatedAt: 'desc' } }),
    platformPrisma.contact.findMany({ where: { tenantId: tenant.id, archivedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] }),
    platformPrisma.property.findMany({ where: { tenantId: tenant.id, archivedAt: null, status: { not: 'ARCHIVADO' } }, select: { id: true, code: true, address: true }, orderBy: { code: 'asc' } }),
    platformPrisma.user.findMany({ where: { tenantId: tenant.id, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return { tasks, events, leads, contacts, properties, users };
}

export async function saveTaskAction(data: { id?: string; title: string; description?: string; dueAt?: string; priority?: typeof TASK_PRIORITIES[number]; assignedUserId?: string; leadId?: string; contactId?: string; propertyId?: string; recurrenceRule?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  if (!data.title.trim()) throw new Error('La tarea necesita un título.');
  await assertUser(tenant.id, data.assignedUserId);
  if (data.leadId) await assertLead(tenant.id, data.leadId);
  if (data.contactId && !(await platformPrisma.contact.findFirst({ where: { id: data.contactId, tenantId: tenant.id, archivedAt: null } }))) throw new Error('Contacto no encontrado.');
  if (data.propertyId && !(await platformPrisma.property.findFirst({ where: { id: data.propertyId, tenantId: tenant.id, archivedAt: null } }))) throw new Error('Propiedad no encontrada.');
  const payload = { title: data.title.trim(), description: data.description?.trim() || null, dueAt: optionalDate(data.dueAt), priority: data.priority || 'NORMAL', assignedUserId: data.assignedUserId || null, leadId: data.leadId || null, contactId: data.contactId || null, propertyId: data.propertyId || null, recurrenceRule: data.recurrenceRule?.trim() || null };
  let task;
  if (data.id) {
    const existing = await platformPrisma.task.findFirst({ where: { id: data.id, tenantId: tenant.id } });
    if (!existing) throw new Error('Tarea no encontrada.');
    task = await platformPrisma.task.update({ where: { id: existing.id }, data: payload });
  } else task = await platformPrisma.task.create({ data: { tenantId: tenant.id, ...payload } });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: data.id ? 'TASK_UPDATED' : 'TASK_CREATED', entityType: 'Task', entityId: task.id });
  revalidatePath('/agenda'); revalidatePath('/crm'); revalidatePath('/dashboard');
  return { success: true, taskId: task.id };
}

export async function setTaskStatusAction(taskId: string, status: typeof TASK_STATUSES[number]) {
  const { tenant, session } = await requireTenantAdmin();
  const task = await platformPrisma.task.findFirst({ where: { id: taskId, tenantId: tenant.id } });
  if (!task) throw new Error('Tarea no encontrada.');
  await platformPrisma.task.update({ where: { id: task.id }, data: { status, completedAt: status === 'DONE' ? new Date() : null } });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'TASK_STATUS_CHANGED', entityType: 'Task', entityId: task.id, metadata: { status } });
  revalidatePath('/agenda'); revalidatePath('/crm'); revalidatePath('/dashboard');
  return { success: true };
}

export async function saveCalendarEventAction(data: { id?: string; title: string; type?: typeof EVENT_TYPES[number]; startsAt: string; endsAt?: string; location?: string; notes?: string; agentId?: string; leadId?: string; contactId?: string; propertyId?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  const startsAt = optionalDate(data.startsAt);
  if (!startsAt) throw new Error('Indicá fecha y hora.');
  const endsAt = optionalDate(data.endsAt);
  if (endsAt && endsAt <= startsAt) throw new Error('La hora de fin debe ser posterior al inicio.');
  await assertUser(tenant.id, data.agentId);
  if (data.leadId) await assertLead(tenant.id, data.leadId);
  if (data.contactId && !(await platformPrisma.contact.findFirst({ where: { id: data.contactId, tenantId: tenant.id, archivedAt: null } }))) throw new Error('Contacto no encontrado.');
  if (data.propertyId && !(await platformPrisma.property.findFirst({ where: { id: data.propertyId, tenantId: tenant.id, archivedAt: null } }))) throw new Error('Propiedad no encontrada.');
  const payload = { title: data.title.trim(), type: data.type || 'VISIT', startsAt, endsAt, location: data.location?.trim() || null, notes: data.notes?.trim() || null, agentId: data.agentId || null, leadId: data.leadId || null, contactId: data.contactId || null, propertyId: data.propertyId || null };
  let event;
  if (data.id) {
    const existing = await platformPrisma.calendarEvent.findFirst({ where: { id: data.id, tenantId: tenant.id } });
    if (!existing) throw new Error('Evento no encontrado.');
    event = await platformPrisma.calendarEvent.update({ where: { id: existing.id }, data: payload });
  } else event = await platformPrisma.calendarEvent.create({ data: { tenantId: tenant.id, ...payload } });
  if (data.leadId && (data.type || 'VISIT') === 'VISIT') await platformPrisma.lead.update({ where: { id: data.leadId }, data: { status: 'VISIT_SCHEDULED', nextActionAt: startsAt } });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: data.id ? 'EVENT_UPDATED' : 'EVENT_CREATED', entityType: 'CalendarEvent', entityId: event.id });
  revalidatePath('/agenda'); revalidatePath('/crm'); revalidatePath('/dashboard');
  return { success: true, eventId: event.id };
}

export async function setCalendarEventStatusAction(eventId: string, status: typeof EVENT_STATUSES[number]) {
  const { tenant, session } = await requireTenantAdmin();
  const event = await platformPrisma.calendarEvent.findFirst({ where: { id: eventId, tenantId: tenant.id } });
  if (!event) throw new Error('Evento no encontrado.');
  await platformPrisma.$transaction(async (tx) => {
    await tx.calendarEvent.update({ where: { id: event.id }, data: { status } });
    if (event.leadId && event.type === 'VISIT' && status === 'COMPLETED') await tx.lead.update({ where: { id: event.leadId }, data: { status: 'VISITED', lastInteractionAt: new Date() } });
  });
  await auditTenantAction({ tenantId: tenant.id, actorUserId: session.userId, action: 'EVENT_STATUS_CHANGED', entityType: 'CalendarEvent', entityId: event.id, metadata: { status } });
  revalidatePath('/agenda'); revalidatePath('/crm'); revalidatePath('/dashboard');
  return { success: true };
}
