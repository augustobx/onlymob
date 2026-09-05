'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { platformPrisma } from '@/lib/prisma-core';
import {
  assertContactBelongsToTenant,
  assertPropertyBelongsToTenant,
  assertRenterBelongsToTenant,
  auditTenantAction,
  requireTenantAdmin,
} from '@/lib/tenant-guard';

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
const MAINTENANCE_STATUSES = ['OPEN', 'TRIAGED', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'RESOLVED', 'CANCELED'] as const;
const COST_BEARERS = ['OWNER', 'RENTER', 'TENANT', 'INSURANCE', 'UNASSIGNED'] as const;
const INSPECTION_TYPES = ['ENTRY', 'EXIT', 'PERIODIC', 'OTHER'] as const;
const INSPECTION_STATUSES = ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'] as const;
const INSPECTION_SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

function optionalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Fecha inválida.');
  return date;
}

async function assertLease(tenantId: string, propertyId: string, propertyLeaseId?: string | null) {
  if (!propertyLeaseId) return null;
  const lease = await platformPrisma.propertyLease.findFirst({
    where: { id: propertyLeaseId, tenantId, propertyId },
    select: { id: true, renterId: true, propertyId: true },
  });
  if (!lease) throw new Error('El contrato no pertenece a esa propiedad o inmobiliaria.');
  return lease;
}

async function assertProvider(tenantId: string, contactId?: string | null) {
  if (!contactId) return null;
  const provider = await platformPrisma.contact.findFirst({
    where: {
      id: contactId,
      tenantId,
      archivedAt: null,
      isActive: true,
      OR: [{ providerProfile: { isNot: null } }, { roles: { some: { role: 'PROVIDER' } } }],
    },
    select: { id: true },
  });
  if (!provider) throw new Error('Proveedor no encontrado para esta inmobiliaria.');
  return provider;
}

async function assertUser(tenantId: string, userId?: string | null) {
  if (!userId) return null;
  const user = await platformPrisma.user.findFirst({ where: { id: userId, tenantId, isActive: true }, select: { id: true } });
  if (!user) throw new Error('Responsable no encontrado para esta inmobiliaria.');
  return user;
}

export async function getMaintenanceDataAction() {
  const { tenant } = await requireTenantAdmin();
  const [requests, providerContacts, properties, leases, renters, users, inspections] = await Promise.all([
    platformPrisma.maintenanceRequest.findMany({
      where: { tenantId: tenant.id },
      include: {
        property: { select: { id: true, code: true, address: true } },
        propertyLease: { select: { id: true, startDate: true, endDate: true } },
        renter: { select: { id: true, firstName: true, lastName: true, dni: true } },
        provider: { select: { id: true, firstName: true, lastName: true, companyName: true, phone: true } },
        assignedUser: { select: { id: true, name: true } },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: { actor: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
    }),
    platformPrisma.contact.findMany({
      where: {
        tenantId: tenant.id,
        archivedAt: null,
        isActive: true,
        OR: [{ providerProfile: { isNot: null } }, { roles: { some: { role: 'PROVIDER' } } }],
      },
      include: { providerProfile: true },
      orderBy: [{ companyName: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    }),
    platformPrisma.property.findMany({
      where: { tenantId: tenant.id, archivedAt: null, status: { not: 'ARCHIVADO' } },
      select: { id: true, code: true, address: true, status: true },
      orderBy: { code: 'asc' },
    }),
    platformPrisma.propertyLease.findMany({
      where: { tenantId: tenant.id, status: { in: ['CURRENT', 'EXPIRING', 'RENEWED'] } },
      include: {
        property: { select: { id: true, code: true, address: true } },
        renter: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { endDate: 'asc' },
    }),
    platformPrisma.propertyRenter.findMany({
      where: { tenantId: tenant.id, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, dni: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    platformPrisma.user.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    platformPrisma.inspection.findMany({
      where: { tenantId: tenant.id },
      include: {
        property: { select: { id: true, code: true, address: true } },
        renter: { select: { id: true, firstName: true, lastName: true } },
        inspector: { select: { id: true, name: true } },
        findings: {
          orderBy: [{ resolved: 'asc' }, { severity: 'desc' }, { createdAt: 'desc' }],
          include: { maintenanceRequest: { select: { id: true, title: true, status: true } } },
        },
      },
      orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  return {
    requests: requests.map((request) => ({
      ...request,
      quotedAmount: request.quotedAmount == null ? null : Number(request.quotedAmount),
      approvedAmount: request.approvedAmount == null ? null : Number(request.approvedAmount),
      actualCost: request.actualCost == null ? null : Number(request.actualCost),
    })),
    providers: providerContacts.map((contact) => ({
      ...contact,
      providerProfile: contact.providerProfile
        ? { ...contact.providerProfile, rating: contact.providerProfile.rating == null ? null : Number(contact.providerProfile.rating) }
        : null,
    })),
    properties,
    leases,
    renters,
    users,
    inspections,
  };
}

const ProviderSchema = z.object({
  contactId: z.string().min(1),
  specialties: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  rating: z.number().min(0).max(5).nullable().optional(),
  insuranceInfo: z.string().max(255).nullable().optional(),
  notes: z.string().max(6000).nullable().optional(),
  isActive: z.boolean().default(true),
});

export async function saveProviderProfileAction(input: z.input<typeof ProviderSchema>) {
  const { tenant, session } = await requireTenantAdmin();
  const data = ProviderSchema.parse(input);
  await assertContactBelongsToTenant(tenant.id, data.contactId);

  const profile = await platformPrisma.$transaction(async (tx) => {
    await tx.contactRole.upsert({
      where: { contactId_role: { contactId: data.contactId, role: 'PROVIDER' } },
      update: {},
      create: { contactId: data.contactId, role: 'PROVIDER' },
    });

    return tx.providerProfile.upsert({
      where: { contactId: data.contactId },
      update: {
        specialties: data.specialties,
        rating: data.rating ?? null,
        insuranceInfo: data.insuranceInfo?.trim() || null,
        notes: data.notes?.trim() || null,
        isActive: data.isActive,
      },
      create: {
        tenantId: tenant.id,
        contactId: data.contactId,
        specialties: data.specialties,
        rating: data.rating ?? null,
        insuranceInfo: data.insuranceInfo?.trim() || null,
        notes: data.notes?.trim() || null,
        isActive: data.isActive,
      },
    });
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'PROVIDER_PROFILE_SAVED',
    entityType: 'ProviderProfile',
    entityId: profile.id,
    metadata: { contactId: data.contactId },
  });
  revalidatePath('/mantenimiento');
  revalidatePath('/contactos');
  return { success: true, providerProfileId: profile.id };
}

const MaintenanceSchema = z.object({
  propertyId: z.string().min(1),
  propertyLeaseId: z.string().nullable().optional(),
  renterId: z.string().nullable().optional(),
  providerContactId: z.string().nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
  category: z.string().trim().min(2).max(80),
  priority: z.enum(PRIORITIES).default('NORMAL'),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(12000),
  reportedBy: z.string().trim().max(120).nullable().optional(),
  quotedAmount: z.number().nonnegative().nullable().optional(),
  approvedAmount: z.number().nonnegative().nullable().optional(),
  actualCost: z.number().nonnegative().nullable().optional(),
  costBearer: z.enum(COST_BEARERS).default('UNASSIGNED'),
  ownerApproved: z.boolean().optional().default(false),
  scheduledAt: z.string().nullable().optional(),
  promisedAt: z.string().nullable().optional(),
});

export async function saveMaintenanceRequestAction(input: z.input<typeof MaintenanceSchema> & { id?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  const data = MaintenanceSchema.parse(input);
  await assertPropertyBelongsToTenant(tenant.id, data.propertyId);
  const lease = await assertLease(tenant.id, data.propertyId, data.propertyLeaseId);
  if (data.renterId) await assertRenterBelongsToTenant(tenant.id, data.renterId);
  if (lease && data.renterId && lease.renterId !== data.renterId) throw new Error('El inquilino no coincide con el contrato seleccionado.');
  await Promise.all([assertProvider(tenant.id, data.providerContactId), assertUser(tenant.id, data.assignedUserId)]);

  const payload = {
    propertyId: data.propertyId,
    propertyLeaseId: data.propertyLeaseId || null,
    renterId: data.renterId || lease?.renterId || null,
    providerContactId: data.providerContactId || null,
    assignedUserId: data.assignedUserId || null,
    category: data.category,
    priority: data.priority,
    title: data.title,
    description: data.description,
    reportedBy: data.reportedBy?.trim() || null,
    quotedAmount: data.quotedAmount ?? null,
    approvedAmount: data.approvedAmount ?? null,
    actualCost: data.actualCost ?? null,
    costBearer: data.costBearer,
    ownerApprovedAt: data.ownerApproved ? new Date() : null,
    scheduledAt: optionalDate(data.scheduledAt),
    promisedAt: optionalDate(data.promisedAt),
  };

  const request = await platformPrisma.$transaction(async (tx) => {
    if (input.id) {
      const existing = await tx.maintenanceRequest.findFirst({ where: { id: input.id, tenantId: tenant.id } });
      if (!existing) throw new Error('Orden de mantenimiento no encontrada.');
      return tx.maintenanceRequest.update({ where: { id: existing.id }, data: payload });
    }

    const created = await tx.maintenanceRequest.create({ data: { tenantId: tenant.id, ...payload } });
    await tx.maintenanceEvent.create({
      data: {
        tenantId: tenant.id,
        maintenanceRequestId: created.id,
        actorUserId: session.userId,
        toStatus: 'OPEN',
        note: 'Orden de mantenimiento creada.',
      },
    });
    return created;
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: input.id ? 'MAINTENANCE_UPDATED' : 'MAINTENANCE_CREATED',
    entityType: 'MaintenanceRequest',
    entityId: request.id,
    metadata: { propertyId: request.propertyId, priority: request.priority },
  });
  revalidatePath('/mantenimiento');
  revalidatePath('/dashboard');
  revalidatePath(`/propiedades/${request.propertyId}`);
  return { success: true, maintenanceRequestId: request.id };
}

export async function setMaintenanceStatusAction(
  maintenanceRequestId: string,
  status: (typeof MAINTENANCE_STATUSES)[number],
  note?: string,
) {
  const { tenant, session } = await requireTenantAdmin();
  if (!MAINTENANCE_STATUSES.includes(status)) throw new Error('Estado de mantenimiento inválido.');
  const existing = await platformPrisma.maintenanceRequest.findFirst({ where: { id: maintenanceRequestId, tenantId: tenant.id } });
  if (!existing) throw new Error('Orden de mantenimiento no encontrada.');
  if (existing.status === status && !note?.trim()) return { success: true };

  await platformPrisma.$transaction(async (tx) => {
    await tx.maintenanceRequest.update({
      where: { id: existing.id },
      data: {
        status,
        startedAt: status === 'IN_PROGRESS' ? existing.startedAt || new Date() : existing.startedAt,
        resolvedAt: status === 'RESOLVED' ? new Date() : existing.resolvedAt,
        resolutionNotes: status === 'RESOLVED' && note?.trim() ? note.trim() : existing.resolutionNotes,
      },
    });
    await tx.maintenanceEvent.create({
      data: {
        tenantId: tenant.id,
        maintenanceRequestId: existing.id,
        actorUserId: session.userId,
        fromStatus: existing.status,
        toStatus: status,
        note: note?.trim() || null,
      },
    });
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'MAINTENANCE_STATUS_CHANGED',
    entityType: 'MaintenanceRequest',
    entityId: existing.id,
    metadata: { fromStatus: existing.status, toStatus: status },
  });
  revalidatePath('/mantenimiento');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function addMaintenanceNoteAction(maintenanceRequestId: string, note: string) {
  const { tenant, session } = await requireTenantAdmin();
  const cleanNote = note.trim();
  if (!cleanNote) throw new Error('Escribí una nota.');
  const existing = await platformPrisma.maintenanceRequest.findFirst({ where: { id: maintenanceRequestId, tenantId: tenant.id }, select: { id: true } });
  if (!existing) throw new Error('Orden de mantenimiento no encontrada.');
  await platformPrisma.maintenanceEvent.create({
    data: { tenantId: tenant.id, maintenanceRequestId: existing.id, actorUserId: session.userId, note: cleanNote },
  });
  revalidatePath('/mantenimiento');
  return { success: true };
}

const InspectionSchema = z.object({
  propertyId: z.string().min(1),
  propertyLeaseId: z.string().nullable().optional(),
  renterId: z.string().nullable().optional(),
  inspectorUserId: z.string().nullable().optional(),
  type: z.enum(INSPECTION_TYPES),
  status: z.enum(INSPECTION_STATUSES).default('DRAFT'),
  scheduledAt: z.string().nullable().optional(),
  performedAt: z.string().nullable().optional(),
  checklist: z.array(z.string().trim().min(1).max(255)).max(100).default([]),
  summary: z.string().max(12000).nullable().optional(),
});

export async function saveInspectionAction(input: z.input<typeof InspectionSchema> & { id?: string }) {
  const { tenant, session } = await requireTenantAdmin();
  const data = InspectionSchema.parse(input);
  await assertPropertyBelongsToTenant(tenant.id, data.propertyId);
  const lease = await assertLease(tenant.id, data.propertyId, data.propertyLeaseId);
  if (data.renterId) await assertRenterBelongsToTenant(tenant.id, data.renterId);
  if (lease && data.renterId && lease.renterId !== data.renterId) throw new Error('El inquilino no coincide con el contrato seleccionado.');
  await assertUser(tenant.id, data.inspectorUserId);

  const payload = {
    propertyId: data.propertyId,
    propertyLeaseId: data.propertyLeaseId || null,
    renterId: data.renterId || lease?.renterId || null,
    inspectorUserId: data.inspectorUserId || null,
    type: data.type,
    status: data.status,
    scheduledAt: optionalDate(data.scheduledAt),
    performedAt: data.status === 'COMPLETED' ? optionalDate(data.performedAt) || new Date() : optionalDate(data.performedAt),
    checklist: data.checklist,
    summary: data.summary?.trim() || null,
  };

  let inspection;
  if (input.id) {
    const existing = await platformPrisma.inspection.findFirst({ where: { id: input.id, tenantId: tenant.id } });
    if (!existing) throw new Error('Inspección no encontrada.');
    inspection = await platformPrisma.inspection.update({ where: { id: existing.id }, data: payload });
  } else {
    inspection = await platformPrisma.inspection.create({ data: { tenantId: tenant.id, ...payload } });
  }

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: input.id ? 'INSPECTION_UPDATED' : 'INSPECTION_CREATED',
    entityType: 'Inspection',
    entityId: inspection.id,
    metadata: { propertyId: inspection.propertyId, type: inspection.type, status: inspection.status },
  });
  revalidatePath('/mantenimiento');
  revalidatePath(`/propiedades/${inspection.propertyId}`);
  return { success: true, inspectionId: inspection.id };
}

const FindingSchema = z.object({
  inspectionId: z.string().min(1),
  severity: z.enum(INSPECTION_SEVERITIES).default('INFO'),
  area: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().min(3).max(6000),
  photos: z.array(z.string().url().max(1000)).max(30).default([]),
});

export async function addInspectionFindingAction(input: z.input<typeof FindingSchema>) {
  const { tenant, session } = await requireTenantAdmin();
  const data = FindingSchema.parse(input);
  const inspection = await platformPrisma.inspection.findFirst({ where: { id: data.inspectionId, tenantId: tenant.id }, select: { id: true, propertyId: true } });
  if (!inspection) throw new Error('Inspección no encontrada.');

  const finding = await platformPrisma.inspectionFinding.create({
    data: {
      tenantId: tenant.id,
      inspectionId: inspection.id,
      severity: data.severity,
      area: data.area?.trim() || null,
      description: data.description,
      photos: data.photos,
    },
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'INSPECTION_FINDING_CREATED',
    entityType: 'InspectionFinding',
    entityId: finding.id,
    metadata: { inspectionId: inspection.id, severity: finding.severity },
  });
  revalidatePath('/mantenimiento');
  return { success: true, findingId: finding.id };
}

export async function createMaintenanceFromFindingAction(findingId: string) {
  const { tenant, session } = await requireTenantAdmin();
  const finding = await platformPrisma.inspectionFinding.findFirst({
    where: { id: findingId, tenantId: tenant.id },
    include: { inspection: true, maintenanceRequest: true },
  });
  if (!finding) throw new Error('Hallazgo no encontrado.');
  if (finding.maintenanceRequest) return { success: true, maintenanceRequestId: finding.maintenanceRequest.id };

  const priority = finding.severity === 'CRITICAL' ? 'URGENT' : finding.severity === 'HIGH' ? 'HIGH' : finding.severity === 'MEDIUM' ? 'NORMAL' : 'LOW';
  const request = await platformPrisma.$transaction(async (tx) => {
    const created = await tx.maintenanceRequest.create({
      data: {
        tenantId: tenant.id,
        propertyId: finding.inspection.propertyId,
        propertyLeaseId: finding.inspection.propertyLeaseId,
        renterId: finding.inspection.renterId,
        category: 'INSPECCION',
        priority,
        title: `Hallazgo de inspección${finding.area ? ` · ${finding.area}` : ''}`,
        description: finding.description,
        reportedBy: 'Inspección OnlyMob',
      },
    });
    await tx.inspectionFinding.update({ where: { id: finding.id }, data: { maintenanceRequestId: created.id } });
    await tx.maintenanceEvent.create({
      data: {
        tenantId: tenant.id,
        maintenanceRequestId: created.id,
        actorUserId: session.userId,
        toStatus: 'OPEN',
        note: `Generada desde inspección ${finding.inspectionId}.`,
      },
    });
    return created;
  });

  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: session.userId,
    action: 'INSPECTION_FINDING_TO_MAINTENANCE',
    entityType: 'MaintenanceRequest',
    entityId: request.id,
    metadata: { findingId: finding.id, inspectionId: finding.inspectionId },
  });
  revalidatePath('/mantenimiento');
  revalidatePath('/dashboard');
  return { success: true, maintenanceRequestId: request.id };
}
