CREATE TABLE `DocumentTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `category` VARCHAR(60) NOT NULL,
  `description` TEXT NULL,
  `body` LONGTEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `DocumentTemplate_tenant_name_key` (`tenantId`, `name`),
  KEY `DocumentTemplate_tenant_category_idx` (`tenantId`, `category`, `isActive`),
  CONSTRAINT `DocumentTemplate_tenantId_fkey`
    FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Document`
  ADD COLUMN `contactId` VARCHAR(191) NULL,
  ADD COLUMN `dealId` VARCHAR(191) NULL,
  ADD COLUMN `paymentId` VARCHAR(191) NULL,
  ADD COLUMN `ownerSettlementId` VARCHAR(191) NULL,
  ADD COLUMN `generatedFromTemplateId` VARCHAR(191) NULL,
  ADD COLUMN `source` VARCHAR(40) NOT NULL DEFAULT 'UPLOAD',
  ADD COLUMN `contentSnapshot` LONGTEXT NULL,
  ADD COLUMN `notes` TEXT NULL,
  ADD KEY `Document_contactId_idx` (`contactId`),
  ADD KEY `Document_dealId_idx` (`dealId`),
  ADD KEY `Document_paymentId_idx` (`paymentId`),
  ADD KEY `Document_ownerSettlementId_idx` (`ownerSettlementId`),
  ADD KEY `Document_generatedFromTemplateId_idx` (`generatedFromTemplateId`),
  ADD CONSTRAINT `Document_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Document_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `Deal` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Document_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Document_ownerSettlementId_fkey` FOREIGN KEY (`ownerSettlementId`) REFERENCES `OwnerSettlement` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Document_generatedFromTemplateId_fkey` FOREIGN KEY (`generatedFromTemplateId`) REFERENCES `DocumentTemplate` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
