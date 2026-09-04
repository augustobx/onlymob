-- OnlyMob baseline schema prior to Phase 1 professionalization.
-- Existing installations should mark this migration as applied once, then run migrate deploy.

CREATE TABLE `Tenant` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(80) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `status` ENUM('ACTIVE','SUSPENDED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `timezone` VARCHAR(80) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  `logoUrl` VARCHAR(500) NULL,
  `address` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `cuit` VARCHAR(30) NULL,
  `receiptHeader` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `archivedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Tenant_slug_key` (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantDomain` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `hostname` VARCHAR(180) NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT false,
  `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TenantDomain_hostname_key` (`hostname`),
  CONSTRAINT `TenantDomain_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Plan` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(60) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `priceMonthly` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `priceYearly` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `maxProperties` INTEGER NOT NULL DEFAULT 50,
  `maxGarages` INTEGER NOT NULL DEFAULT 10,
  `maxUsers` INTEGER NOT NULL DEFAULT 5,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Plan_code_key` (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantSubscription` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  `status` ENUM('TRIAL','ACTIVE','PAST_DUE','SUSPENDED','CANCELED') NOT NULL DEFAULT 'TRIAL',
  `currentPeriodStart` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `currentPeriodEnd` DATETIME(3) NOT NULL,
  `trialEndsAt` DATETIME(3) NULL,
  `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `TenantSubscription_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TenantSubscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantFeatureOverride` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `featureKey` VARCHAR(80) NOT NULL,
  `enabled` BOOLEAN NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TenantFeatureOverride_tenantId_featureKey_key` (`tenantId`,`featureKey`),
  CONSTRAINT `TenantFeatureOverride_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SaasPayment` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'ARS',
  `status` ENUM('PENDING','PAID','FAILED','REFUNDED','VOID') NOT NULL DEFAULT 'PENDING',
  `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reference` VARCHAR(120) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `SaasPayment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SuperAdminUser` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `role` ENUM('SUPERADMIN','SUPPORT') NOT NULL DEFAULT 'SUPERADMIN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SuperAdminUser_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `role` ENUM('ADMIN','STAFF') NOT NULL DEFAULT 'ADMIN',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `lastLoginAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `User_tenantId_email_key` (`tenantId`,`email`),
  CONSTRAINT `User_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PropertyRenter` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `firstName` VARCHAR(80) NOT NULL,
  `lastName` VARCHAR(80) NOT NULL,
  `dni` VARCHAR(30) NOT NULL,
  `email` VARCHAR(120) NULL,
  `phone` VARCHAR(50) NULL,
  `address` VARCHAR(200) NULL,
  `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `portalPasswordHash` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PropertyRenter_tenantId_dni_key` (`tenantId`,`dni`),
  INDEX `PropertyRenter_tenantId_email_idx` (`tenantId`,`email`),
  CONSTRAINT `PropertyRenter_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Property` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `type` ENUM('DEPARTAMENTO','CASA','LOCAL','TERRENO','OFICINA','COCHERA','OTRO') NOT NULL DEFAULT 'DEPARTAMENTO',
  `rooms` INTEGER NULL,
  `sqm` DECIMAL(8,2) NULL,
  `baseRent` DECIMAL(12,2) NULL,
  `expensesShare` DECIMAL(6,2) NULL,
  `status` ENUM('DISPONIBLE','ALQUILADO','MANTENIMIENTO','ARCHIVADO') NOT NULL DEFAULT 'DISPONIBLE',
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Property_tenantId_code_key` (`tenantId`,`code`),
  CONSTRAINT `Property_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Garage` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `totalSpaces` INTEGER NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `Garage_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GarageSpace` (
  `id` VARCHAR(191) NOT NULL,
  `garageId` VARCHAR(191) NOT NULL,
  `spaceNumber` VARCHAR(30) NOT NULL,
  `status` ENUM('FREE','OCCUPIED','MAINTENANCE') NOT NULL DEFAULT 'FREE',
  `notes` VARCHAR(200) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `GarageSpace_garageId_spaceNumber_key` (`garageId`,`spaceNumber`),
  CONSTRAINT `GarageSpace_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PropertyLease` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `renterId` VARCHAR(191) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `currentRent` DECIMAL(12,2) NOT NULL,
  `deposit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `increasePercent` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `updatePeriodMonths` INTEGER NOT NULL DEFAULT 4,
  `status` ENUM('CURRENT','TERMINATED') NOT NULL DEFAULT 'CURRENT',
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `PropertyLease_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PropertyLease_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `PropertyLease_renterId_fkey` FOREIGN KEY (`renterId`) REFERENCES `PropertyRenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GarageLease` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `renterId` VARCHAR(191) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `rentPerSpace` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `totalRent` DECIMAL(12,2) NOT NULL,
  `deposit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `increasePercent` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('CURRENT','TERMINATED') NOT NULL DEFAULT 'CURRENT',
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `GarageLease_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GarageLease_renterId_fkey` FOREIGN KEY (`renterId`) REFERENCES `PropertyRenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GarageLeaseSpace` (
  `id` VARCHAR(191) NOT NULL,
  `leaseId` VARCHAR(191) NOT NULL,
  `spaceId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `GarageLeaseSpace_leaseId_spaceId_key` (`leaseId`,`spaceId`),
  CONSTRAINT `GarageLeaseSpace_leaseId_fkey` FOREIGN KEY (`leaseId`) REFERENCES `GarageLease`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GarageLeaseSpace_spaceId_fkey` FOREIGN KEY (`spaceId`) REFERENCES `GarageSpace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RentHistory` (
  `id` VARCHAR(191) NOT NULL,
  `propertyLeaseId` VARCHAR(191) NULL,
  `garageLeaseId` VARCHAR(191) NULL,
  `changeDate` DATE NOT NULL,
  `oldRent` DECIMAL(12,2) NOT NULL,
  `newRent` DECIMAL(12,2) NOT NULL,
  `percent` DECIMAL(6,2) NULL,
  `indexUsed` VARCHAR(50) NULL,
  `notes` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `RentHistory_propertyLeaseId_fkey` FOREIGN KEY (`propertyLeaseId`) REFERENCES `PropertyLease`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RentHistory_garageLeaseId_fkey` FOREIGN KEY (`garageLeaseId`) REFERENCES `GarageLease`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Debt` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `leaseType` ENUM('PROPERTY','GARAGE') NOT NULL DEFAULT 'PROPERTY',
  `propertyLeaseId` VARCHAR(191) NULL,
  `garageLeaseId` VARCHAR(191) NULL,
  `renterId` VARCHAR(191) NOT NULL,
  `type` ENUM('ALQUILER','EXPENSAS','DEPOSITO','LUZ','GAS','AGUA','OTROS') NOT NULL DEFAULT 'ALQUILER',
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `dueDate` DATE NOT NULL,
  `paidAmount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('PENDING','PARTIAL','PAID','OVERDUE') NOT NULL DEFAULT 'PENDING',
  `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Debt_tenantId_dueDate_idx` (`tenantId`,`dueDate`),
  INDEX `Debt_tenantId_status_idx` (`tenantId`,`status`),
  CONSTRAINT `Debt_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Debt_propertyLeaseId_fkey` FOREIGN KEY (`propertyLeaseId`) REFERENCES `PropertyLease`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Debt_garageLeaseId_fkey` FOREIGN KEY (`garageLeaseId`) REFERENCES `GarageLease`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Debt_renterId_fkey` FOREIGN KEY (`renterId`) REFERENCES `PropertyRenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Payment` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `debtId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `method` ENUM('EFECTIVO','TRANSFERENCIA','TARJETA','MERCADOPAGO','OTRO') NOT NULL DEFAULT 'EFECTIVO',
  `reference` VARCHAR(120) NULL,
  `receiptNumber` VARCHAR(60) NULL,
  `receiptPdfUrl` VARCHAR(500) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Payment_tenantId_paidAt_idx` (`tenantId`,`paidAt`),
  CONSTRAINT `Payment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Payment_debtId_fkey` FOREIGN KEY (`debtId`) REFERENCES `Debt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Document` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NULL,
  `renterId` VARCHAR(191) NULL,
  `propertyLeaseId` VARCHAR(191) NULL,
  `category` VARCHAR(60) NOT NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `fileUrl` VARCHAR(500) NOT NULL,
  `fileSize` INTEGER NULL,
  `mimeType` VARCHAR(100) NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `Document_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Document_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Document_renterId_fkey` FOREIGN KEY (`renterId`) REFERENCES `PropertyRenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Document_propertyLeaseId_fkey` FOREIGN KEY (`propertyLeaseId`) REFERENCES `PropertyLease`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantSetting` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TenantSetting_tenantId_key_key` (`tenantId`,`key`),
  CONSTRAINT `TenantSetting_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
