-- Phase 1: professional SaaS core, roles, contacts/owners, property enrichment,
-- counters and audit trail. This migration is additive and preserves legacy data.

CREATE TABLE `RoleProfile` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `isSystem` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `RoleProfile_tenantId_key_key` (`tenantId`,`key`),
  INDEX `RoleProfile_tenantId_idx` (`tenantId`),
  CONSTRAINT `RoleProfile_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RolePermission` (
  `id` VARCHAR(191) NOT NULL,
  `roleId` VARCHAR(191) NOT NULL,
  `module` VARCHAR(60) NOT NULL,
  `action` VARCHAR(40) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `RolePermission_roleId_module_action_key` (`roleId`,`module`,`action`),
  INDEX `RolePermission_roleId_idx` (`roleId`),
  CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `RoleProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `User`
  ADD COLUMN `roleProfileId` VARCHAR(191) NULL;
CREATE INDEX `User_tenantId_isActive_idx` ON `User`(`tenantId`,`isActive`);
CREATE INDEX `User_roleProfileId_idx` ON `User`(`roleProfileId`);
ALTER TABLE `User`
  ADD CONSTRAINT `User_roleProfileId_fkey` FOREIGN KEY (`roleProfileId`) REFERENCES `RoleProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `Contact` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `firstName` VARCHAR(80) NOT NULL,
  `lastName` VARCHAR(80) NOT NULL,
  `companyName` VARCHAR(160) NULL,
  `documentType` VARCHAR(20) NULL,
  `documentNumber` VARCHAR(40) NULL,
  `cuit` VARCHAR(30) NULL,
  `email` VARCHAR(120) NULL,
  `phone` VARCHAR(50) NULL,
  `alternatePhone` VARCHAR(50) NULL,
  `address` VARCHAR(255) NULL,
  `city` VARCHAR(100) NULL,
  `province` VARCHAR(100) NULL,
  `postalCode` VARCHAR(20) NULL,
  `bankAlias` VARCHAR(120) NULL,
  `bankCbu` VARCHAR(40) NULL,
  `notes` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `archivedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `Contact_tenantId_lastName_firstName_idx` (`tenantId`,`lastName`,`firstName`),
  INDEX `Contact_tenantId_email_idx` (`tenantId`,`email`),
  INDEX `Contact_tenantId_documentNumber_idx` (`tenantId`,`documentNumber`),
  CONSTRAINT `Contact_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContactRole` (
  `id` VARCHAR(191) NOT NULL,
  `contactId` VARCHAR(191) NOT NULL,
  `role` ENUM('PROSPECT','BUYER','RENTAL_PROSPECT','RENTER','OWNER','GUARANTOR','PROVIDER','GENERAL') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ContactRole_contactId_role_key` (`contactId`,`role`),
  INDEX `ContactRole_contactId_idx` (`contactId`),
  CONSTRAINT `ContactRole_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Property`
  MODIFY `sqm` DECIMAL(10,2) NULL,
  ADD COLUMN `agentId` VARCHAR(191) NULL,
  ADD COLUMN `subtype` VARCHAR(80) NULL,
  ADD COLUMN `operation` ENUM('RENT','SALE','TEMPORARY_RENT','MANAGEMENT') NOT NULL DEFAULT 'RENT',
  ADD COLUMN `commercialStatus` ENUM('DRAFT','AVAILABLE','RESERVED','UNDER_NEGOTIATION','CLOSED','PAUSED','ARCHIVED') NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN `bedrooms` INTEGER NULL,
  ADD COLUMN `bathrooms` INTEGER NULL,
  ADD COLUMN `garageCount` INTEGER NULL,
  ADD COLUMN `coveredSqm` DECIMAL(10,2) NULL,
  ADD COLUMN `semiCoveredSqm` DECIMAL(10,2) NULL,
  ADD COLUMN `landSqm` DECIMAL(10,2) NULL,
  ADD COLUMN `rentPrice` DECIMAL(14,2) NULL,
  ADD COLUMN `salePrice` DECIMAL(14,2) NULL,
  ADD COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT 'ARS',
  ADD COLUMN `expenses` DECIMAL(12,2) NULL,
  ADD COLUMN `commissionPercent` DECIMAL(6,2) NULL,
  ADD COLUMN `street` VARCHAR(160) NULL,
  ADD COLUMN `streetNumber` VARCHAR(30) NULL,
  ADD COLUMN `floor` VARCHAR(20) NULL,
  ADD COLUMN `unit` VARCHAR(20) NULL,
  ADD COLUMN `city` VARCHAR(100) NULL,
  ADD COLUMN `province` VARCHAR(100) NULL,
  ADD COLUMN `country` VARCHAR(80) NOT NULL DEFAULT 'Argentina',
  ADD COLUMN `postalCode` VARCHAR(20) NULL,
  ADD COLUMN `latitude` DECIMAL(10,7) NULL,
  ADD COLUMN `longitude` DECIMAL(10,7) NULL,
  ADD COLUMN `ageYears` INTEGER NULL,
  ADD COLUMN `orientation` VARCHAR(50) NULL,
  ADD COLUMN `amenities` JSON NULL,
  ADD COLUMN `publicDescription` TEXT NULL,
  ADD COLUMN `internalDescription` TEXT NULL,
  ADD COLUMN `coverImageUrl` VARCHAR(500) NULL,
  ADD COLUMN `availableFrom` DATE NULL,
  ADD COLUMN `capturedAt` DATETIME(3) NULL,
  ADD COLUMN `captureSource` VARCHAR(100) NULL,
  ADD COLUMN `publishedAt` DATETIME(3) NULL,
  ADD COLUMN `archivedAt` DATETIME(3) NULL;

-- Preserve the historical rental amount as the initial commercial rent where available.
UPDATE `Property` SET `rentPrice` = `baseRent` WHERE `rentPrice` IS NULL AND `baseRent` IS NOT NULL;

CREATE INDEX `Property_tenantId_status_idx` ON `Property`(`tenantId`,`status`);
CREATE INDEX `Property_tenantId_commercialStatus_idx` ON `Property`(`tenantId`,`commercialStatus`);
CREATE INDEX `Property_tenantId_operation_type_idx` ON `Property`(`tenantId`,`operation`,`type`);
CREATE INDEX `Property_tenantId_city_idx` ON `Property`(`tenantId`,`city`);
CREATE INDEX `Property_agentId_idx` ON `Property`(`agentId`);
ALTER TABLE `Property`
  ADD CONSTRAINT `Property_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `PropertyOwner` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `contactId` VARCHAR(191) NOT NULL,
  `ownershipPercentage` DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  `isPrimary` BOOLEAN NOT NULL DEFAULT false,
  `settlementPreference` VARCHAR(120) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PropertyOwner_propertyId_contactId_key` (`propertyId`,`contactId`),
  INDEX `PropertyOwner_tenantId_propertyId_idx` (`tenantId`,`propertyId`),
  INDEX `PropertyOwner_tenantId_contactId_idx` (`tenantId`,`contactId`),
  CONSTRAINT `PropertyOwner_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PropertyOwner_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PropertyOwner_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantCounter` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(60) NOT NULL,
  `value` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TenantCounter_tenantId_key_key` (`tenantId`,`key`),
  CONSTRAINT `TenantCounter_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `actorType` ENUM('USER','SUPERADMIN','RENTER','SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  `action` VARCHAR(80) NOT NULL,
  `entityType` VARCHAR(80) NOT NULL,
  `entityId` VARCHAR(80) NULL,
  `metadata` JSON NULL,
  `ipAddress` VARCHAR(64) NULL,
  `userAgent` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AuditLog_tenantId_createdAt_idx` (`tenantId`,`createdAt`),
  INDEX `AuditLog_tenantId_entityType_entityId_idx` (`tenantId`,`entityType`,`entityId`),
  INDEX `AuditLog_actorUserId_idx` (`actorUserId`),
  CONSTRAINT `AuditLog_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `TenantDomain_tenantId_idx` ON `TenantDomain`(`tenantId`);
CREATE INDEX `TenantSubscription_tenantId_status_idx` ON `TenantSubscription`(`tenantId`,`status`);
CREATE INDEX `TenantSubscription_planId_idx` ON `TenantSubscription`(`planId`);
CREATE INDEX `SaasPayment_tenantId_paymentDate_idx` ON `SaasPayment`(`tenantId`,`paymentDate`);
CREATE INDEX `PropertyRenter_tenantId_status_idx` ON `PropertyRenter`(`tenantId`,`status`);
CREATE INDEX `Garage_tenantId_idx` ON `Garage`(`tenantId`);
CREATE INDEX `GarageSpace_garageId_status_idx` ON `GarageSpace`(`garageId`,`status`);
CREATE INDEX `PropertyLease_tenantId_status_idx` ON `PropertyLease`(`tenantId`,`status`);
CREATE INDEX `PropertyLease_tenantId_endDate_idx` ON `PropertyLease`(`tenantId`,`endDate`);
CREATE INDEX `PropertyLease_propertyId_idx` ON `PropertyLease`(`propertyId`);
CREATE INDEX `PropertyLease_renterId_idx` ON `PropertyLease`(`renterId`);
CREATE INDEX `GarageLease_tenantId_status_idx` ON `GarageLease`(`tenantId`,`status`);
CREATE INDEX `GarageLease_tenantId_endDate_idx` ON `GarageLease`(`tenantId`,`endDate`);
CREATE INDEX `GarageLease_renterId_idx` ON `GarageLease`(`renterId`);
CREATE INDEX `GarageLeaseSpace_spaceId_idx` ON `GarageLeaseSpace`(`spaceId`);
CREATE INDEX `RentHistory_propertyLeaseId_changeDate_idx` ON `RentHistory`(`propertyLeaseId`,`changeDate`);
CREATE INDEX `RentHistory_garageLeaseId_changeDate_idx` ON `RentHistory`(`garageLeaseId`,`changeDate`);
CREATE INDEX `Debt_tenantId_renterId_idx` ON `Debt`(`tenantId`,`renterId`);
CREATE INDEX `Payment_debtId_idx` ON `Payment`(`debtId`);
CREATE UNIQUE INDEX `Payment_tenantId_receiptNumber_key` ON `Payment`(`tenantId`,`receiptNumber`);
CREATE INDEX `Document_tenantId_category_idx` ON `Document`(`tenantId`,`category`);
CREATE INDEX `Document_propertyId_idx` ON `Document`(`propertyId`);
CREATE INDEX `Document_renterId_idx` ON `Document`(`renterId`);
CREATE INDEX `Document_propertyLeaseId_idx` ON `Document`(`propertyLeaseId`);
