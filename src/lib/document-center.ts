import 'server-only';

import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';

export type DocumentTemplateRecord = {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  description: string | null;
  body: string;
  isActive: number | boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentCenterRecord = {
  id: string;
  tenantId: string;
  propertyId: string | null;
  renterId: string | null;
  propertyLeaseId: string | null;
  maintenanceRequestId: string | null;
  inspectionId: string | null;
  contactId: string | null;
  dealId: string | null;
  paymentId: string | null;
  ownerSettlementId: string | null;
  generatedFromTemplateId: string | null;
  category: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  source: string;
  contentSnapshot: string | null;
  notes: string | null;
  uploadedAt: Date;
  entityLabel: string | null;
  templateName: string | null;
};

export async function listDocumentTemplates(tenantId: string) {
  return platformPrisma.$queryRaw<DocumentTemplateRecord[]>(Prisma.sql`
    SELECT id, tenantId, name, category, description, body, isActive, createdAt, updatedAt
    FROM DocumentTemplate
    WHERE tenantId = ${tenantId}
    ORDER BY isActive DESC, name ASC
  `);
}

export async function saveDocumentTemplate(input: {
  tenantId: string;
  id?: string | null;
  name: string;
  category: string;
  description?: string | null;
  body: string;
  isActive?: boolean;
}) {
  const id = input.id || randomUUID();
  const now = new Date();

  if (input.id) {
    const updated = await platformPrisma.$executeRaw(Prisma.sql`
      UPDATE DocumentTemplate
      SET name = ${input.name}, category = ${input.category}, description = ${input.description || null},
          body = ${input.body}, isActive = ${input.isActive !== false}, updatedAt = ${now}
      WHERE id = ${id} AND tenantId = ${input.tenantId}
    `);
    if (!updated) throw new Error('Plantilla no encontrada.');
    return id;
  }

  await platformPrisma.$executeRaw(Prisma.sql`
    INSERT INTO DocumentTemplate (
      id, tenantId, name, category, description, body, isActive, createdAt, updatedAt
    ) VALUES (
      ${id}, ${input.tenantId}, ${input.name}, ${input.category}, ${input.description || null},
      ${input.body}, ${input.isActive !== false}, ${now}, ${now}
    )
  `);
  return id;
}

export async function setDocumentTemplateActive(tenantId: string, templateId: string, isActive: boolean) {
  await platformPrisma.$executeRaw(Prisma.sql`
    UPDATE DocumentTemplate
    SET isActive = ${isActive}, updatedAt = NOW(3)
    WHERE id = ${templateId} AND tenantId = ${tenantId}
  `);
}

export async function getDocumentTemplate(tenantId: string, templateId: string) {
  const rows = await platformPrisma.$queryRaw<DocumentTemplateRecord[]>(Prisma.sql`
    SELECT id, tenantId, name, category, description, body, isActive, createdAt, updatedAt
    FROM DocumentTemplate
    WHERE id = ${templateId} AND tenantId = ${tenantId}
    LIMIT 1
  `);
  return rows[0] || null;
}

export async function listDocuments(tenantId: string, limit = 150) {
  const safeLimit = Math.max(1, Math.min(limit, 300));
  return platformPrisma.$queryRaw<DocumentCenterRecord[]>(Prisma.sql`
    SELECT
      d.id, d.tenantId, d.propertyId, d.renterId, d.propertyLeaseId,
      d.maintenanceRequestId, d.inspectionId, d.contactId, d.dealId, d.paymentId,
      d.ownerSettlementId, d.generatedFromTemplateId, d.category, d.fileName, d.fileUrl,
      d.fileSize, d.mimeType, d.source, d.contentSnapshot, d.notes, d.uploadedAt,
      dt.name AS templateName,
      CASE
        WHEN d.propertyId IS NOT NULL THEN CONCAT('Propiedad ', p.code, ' · ', p.address)
        WHEN d.contactId IS NOT NULL THEN CONCAT(c.firstName, ' ', c.lastName)
        WHEN d.renterId IS NOT NULL THEN CONCAT(r.firstName, ' ', r.lastName, ' · DNI ', r.dni)
        WHEN d.propertyLeaseId IS NOT NULL THEN CONCAT('Contrato ', lp.code, ' · ', lr.firstName, ' ', lr.lastName)
        WHEN d.dealId IS NOT NULL THEN CONCAT('Operación ', dp.code)
        WHEN d.paymentId IS NOT NULL THEN CONCAT('Pago ', COALESCE(pay.receiptNumber, pay.id))
        WHEN d.maintenanceRequestId IS NOT NULL THEN CONCAT('Mantenimiento · ', mr.title)
        WHEN d.ownerSettlementId IS NOT NULL THEN CONCAT('Liquidación · ', oc.firstName, ' ', oc.lastName)
        WHEN d.inspectionId IS NOT NULL THEN CONCAT('Inspección · ', ip.code)
        ELSE NULL
      END AS entityLabel
    FROM Document d
    LEFT JOIN DocumentTemplate dt ON dt.id = d.generatedFromTemplateId
    LEFT JOIN Property p ON p.id = d.propertyId AND p.tenantId = d.tenantId
    LEFT JOIN Contact c ON c.id = d.contactId AND c.tenantId = d.tenantId
    LEFT JOIN PropertyRenter r ON r.id = d.renterId AND r.tenantId = d.tenantId
    LEFT JOIN PropertyLease pl ON pl.id = d.propertyLeaseId AND pl.tenantId = d.tenantId
    LEFT JOIN Property lp ON lp.id = pl.propertyId
    LEFT JOIN PropertyRenter lr ON lr.id = pl.renterId
    LEFT JOIN Deal dealRow ON dealRow.id = d.dealId AND dealRow.tenantId = d.tenantId
    LEFT JOIN Property dp ON dp.id = dealRow.propertyId
    LEFT JOIN Payment pay ON pay.id = d.paymentId AND pay.tenantId = d.tenantId
    LEFT JOIN MaintenanceRequest mr ON mr.id = d.maintenanceRequestId AND mr.tenantId = d.tenantId
    LEFT JOIN OwnerSettlement os ON os.id = d.ownerSettlementId AND os.tenantId = d.tenantId
    LEFT JOIN Contact oc ON oc.id = os.ownerContactId
    LEFT JOIN Inspection ins ON ins.id = d.inspectionId AND ins.tenantId = d.tenantId
    LEFT JOIN Property ip ON ip.id = ins.propertyId
    WHERE d.tenantId = ${tenantId}
    ORDER BY d.uploadedAt DESC
    LIMIT ${safeLimit}
  `);
}

export async function registerDocument(input: {
  tenantId: string;
  category: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  source?: string;
  contentSnapshot?: string | null;
  notes?: string | null;
  templateId?: string | null;
  propertyId?: string | null;
  renterId?: string | null;
  propertyLeaseId?: string | null;
  maintenanceRequestId?: string | null;
  inspectionId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  paymentId?: string | null;
  ownerSettlementId?: string | null;
}) {
  const id = randomUUID();
  await platformPrisma.$executeRaw(Prisma.sql`
    INSERT INTO Document (
      id, tenantId, propertyId, renterId, propertyLeaseId, maintenanceRequestId, inspectionId,
      contactId, dealId, paymentId, ownerSettlementId, generatedFromTemplateId,
      category, fileName, fileUrl, fileSize, mimeType, source, contentSnapshot, notes, uploadedAt
    ) VALUES (
      ${id}, ${input.tenantId}, ${input.propertyId || null}, ${input.renterId || null},
      ${input.propertyLeaseId || null}, ${input.maintenanceRequestId || null}, ${input.inspectionId || null},
      ${input.contactId || null}, ${input.dealId || null}, ${input.paymentId || null},
      ${input.ownerSettlementId || null}, ${input.templateId || null}, ${input.category}, ${input.fileName},
      ${input.fileUrl}, ${input.fileSize ?? null}, ${input.mimeType || null}, ${input.source || 'UPLOAD'},
      ${input.contentSnapshot || null}, ${input.notes || null}, ${new Date()}
    )
  `);
  return id;
}

export async function getGeneratedDocument(tenantId: string, documentId: string) {
  const rows = await platformPrisma.$queryRaw<DocumentCenterRecord[]>(Prisma.sql`
    SELECT d.id, d.tenantId, d.propertyId, d.renterId, d.propertyLeaseId,
           d.maintenanceRequestId, d.inspectionId, d.contactId, d.dealId, d.paymentId,
           d.ownerSettlementId, d.generatedFromTemplateId, d.category, d.fileName, d.fileUrl,
           d.fileSize, d.mimeType, d.source, d.contentSnapshot, d.notes, d.uploadedAt,
           NULL AS entityLabel, NULL AS templateName
    FROM Document d
    WHERE d.id = ${documentId} AND d.tenantId = ${tenantId}
    LIMIT 1
  `);
  return rows[0] || null;
}
