-- Phase 3: maintenance, providers and inspections.
-- Additive migration. Existing tenant, property, lease, renter and document data is preserved.

CREATE TABLE `ProviderProfile` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `contactId` VARCHAR(191) NOT NULL,
  `specialties` JSON NULL,
  `rating` DECIMAL(3,2) NULL,
  `insuranceInfo` VARCHAR(255) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProviderProfile_contactId_key` (`contactId`),
  INDEX `ProviderProfile_tenantId_isActive_idx` (`tenantId`,`isActive`),
  CONSTRAINT `ProviderProfile_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProviderProfile_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MaintenanceRequest` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `propertyLeaseId` VARCHAR(191) NULL,
  `renterId` VARCHAR(191) NULL,
  `providerContactId` VARCHAR(191) NULL,
  `assignedUserId` VARCHAR(191) NULL,
  `category` VARCHAR(80) NOT NULL,
  `priority` ENUM('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
  `status` ENUM('OPEN','TRIAGED','QUOTED','APPROVED','IN_PROGRESS','WAITING_PARTS','RESOLVED','CANCELED') NOT NULL DEFAULT 'OPEN',
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NOT NULL,
  `reportedBy` VARCHAR(120) NULL,
  `quotedAmount` DECIMAL(14,2) NULL,
  `approvedAmount` DECIMAL(14,2) NULL,
  `actualCost` DECIMAL(14,2) NULL,
  `costBearer` ENUM('OWNER','RENTER','TENANT','INSURANCE','UNASSIGNED') NOT NULL DEFAULT 'UNASSIGNED',
  `ownerApprovedAt` DATETIME(3) NULL,
  `scheduledAt` DATETIME(3) NULL,
  `promisedAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `resolutionNotes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `MaintenanceRequest_tenantId_status_priority_idx` (`tenantId`,`status`,`priority`),
  INDEX `MaintenanceRequest_tenantId_providerContactId_status_idx` (`tenantId`,`providerContactId`,`status`),
  INDEX `MaintenanceRequest_propertyId_status_idx` (`propertyId`,`status`),
  INDEX `MaintenanceRequest_propertyLeaseId_idx` (`propertyLeaseId`),
  INDEX `MaintenanceRequest_renterId_idx` (`renterId`),
  INDEX `MaintenanceRequest_assignedUserId_status_idx` (`assignedUserId`,`status`),
  CONSTRAINT `MaintenanceRequest_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MaintenanceRequest_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `MaintenanceRequest_propertyLeaseId_fkey` FOREIGN KEY (`propertyLeaseId`) REFERENCES `PropertyLease`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `MaintenanceRequest_renterId_fkey` FOREIGN KEY (`renterId`) REFERENCES `PropertyRenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `MaintenanceRequest_providerContactId_fkey` FOREIGN KEY (`providerContactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `MaintenanceRequest_assignedUserId_fkey` FOREIGN KEY (`assignedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MaintenanceEvent` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `maintenanceRequestId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `fromStatus` ENUM('OPEN','TRIAGED','QUOTED','APPROVED','IN_PROGRESS','WAITING_PARTS','RESOLVED','CANCELED') NULL,
  `toStatus` ENUM('OPEN','TRIAGED','QUOTED','APPROVED','IN_PROGRESS','WAITING_PARTS','RESOLVED','CANCELED') NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `MaintenanceEvent_tenantId_createdAt_idx` (`tenantId`,`createdAt`),
  INDEX `MaintenanceEvent_maintenanceRequestId_createdAt_idx` (`maintenanceRequestId`,`createdAt`),
  CONSTRAINT `MaintenanceEvent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MaintenanceEvent_maintenanceRequestId_fkey` FOREIGN KEY (`maintenanceRequestId`) REFERENCES `MaintenanceRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MaintenanceEvent_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Inspection` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `propertyLeaseId` VARCHAR(191) NULL,
  `renterId` VARCHAR(191) NULL,
  `inspectorUserId` VARCHAR(191) NULL,
  `type` ENUM('ENTRY','EXIT','PERIODIC','OTHER') NOT NULL,
  `status` ENUM('DRAFT','SCHEDULED','IN_PROGRESS','COMPLETED','CANCELED') NOT NULL DEFAULT 'DRAFT',
  `scheduledAt` DATETIME(3) NULL,
  `performedAt` DATETIME(3) NULL,
  `checklist` JSON NULL,
  `summary` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Inspection_tenantId_status_scheduledAt_idx` (`tenantId`,`status`,`scheduledAt`),
  INDEX `Inspection_propertyId_performedAt_idx` (`propertyId`,`performedAt`),
  INDEX `Inspection_propertyLeaseId_idx` (`propertyLeaseId`),
  INDEX `Inspection_renterId_idx` (`renterId`),
  INDEX `Inspection_inspectorUserId_status_idx` (`inspectorUserId`,`status`),
  CONSTRAINT `Inspection_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Inspection_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Inspection_propertyLeaseId_fkey` FOREIGN KEY (`propertyLeaseId`) REFERENCES `PropertyLease`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Inspection_renterId_fkey` FOREIGN KEY (`renterId`) REFERENCES `PropertyRenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Inspection_inspectorUserId_fkey` FOREIGN KEY (`inspectorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InspectionFinding` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `inspectionId` VARCHAR(191) NOT NULL,
  `maintenanceRequestId` VARCHAR(191) NULL,
  `severity` ENUM('INFO','LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'INFO',
  `area` VARCHAR(100) NULL,
  `description` TEXT NOT NULL,
  `photos` JSON NULL,
  `resolved` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `InspectionFinding_tenantId_severity_resolved_idx` (`tenantId`,`severity`,`resolved`),
  INDEX `InspectionFinding_inspectionId_idx` (`inspectionId`),
  INDEX `InspectionFinding_maintenanceRequestId_idx` (`maintenanceRequestId`),
  CONSTRAINT `InspectionFinding_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `InspectionFinding_inspectionId_fkey` FOREIGN KEY (`inspectionId`) REFERENCES `Inspection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `InspectionFinding_maintenanceRequestId_fkey` FOREIGN KEY (`maintenanceRequestId`) REFERENCES `MaintenanceRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Document`
  ADD COLUMN `maintenanceRequestId` VARCHAR(191) NULL,
  ADD COLUMN `inspectionId` VARCHAR(191) NULL;

CREATE INDEX `Document_maintenanceRequestId_idx` ON `Document`(`maintenanceRequestId`);
CREATE INDEX `Document_inspectionId_idx` ON `Document`(`inspectionId`);

ALTER TABLE `Document`
  ADD CONSTRAINT `Document_maintenanceRequestId_fkey` FOREIGN KEY (`maintenanceRequestId`) REFERENCES `MaintenanceRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Document_inspectionId_fkey` FOREIGN KEY (`inspectionId`) REFERENCES `Inspection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
