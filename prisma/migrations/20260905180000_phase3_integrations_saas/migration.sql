CREATE TABLE `ApiCredential` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `tokenPrefix` VARCHAR(24) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `scopes` LONGTEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `lastUsedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ApiCredential_tokenHash_key` (`tokenHash`),
  KEY `ApiCredential_tenant_active_idx` (`tenantId`, `isActive`),
  CONSTRAINT `ApiCredential_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WebhookEndpoint` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `events` LONGTEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `WebhookEndpoint_tenant_active_idx` (`tenantId`, `isActive`),
  CONSTRAINT `WebhookEndpoint_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WebhookDelivery` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `endpointId` VARCHAR(191) NOT NULL,
  `eventKey` VARCHAR(100) NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `httpStatus` INTEGER NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` VARCHAR(500) NULL,
  `deliveredAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `WebhookDelivery_tenant_event_idx` (`tenantId`, `eventKey`, `createdAt`),
  KEY `WebhookDelivery_endpoint_status_idx` (`endpointId`, `status`, `createdAt`),
  CONSTRAINT `WebhookDelivery_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `WebhookDelivery_endpointId_fkey` FOREIGN KEY (`endpointId`) REFERENCES `WebhookEndpoint`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SubscriptionEvent` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `subscriptionId` VARCHAR(191) NULL,
  `actorSuperAdminId` VARCHAR(191) NULL,
  `eventType` VARCHAR(80) NOT NULL,
  `fromStatus` VARCHAR(30) NULL,
  `toStatus` VARCHAR(30) NULL,
  `fromPlanCode` VARCHAR(60) NULL,
  `toPlanCode` VARCHAR(60) NULL,
  `metadata` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `SubscriptionEvent_tenant_created_idx` (`tenantId`, `createdAt`),
  CONSTRAINT `SubscriptionEvent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ImpersonationGrant` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `superAdminId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ImpersonationGrant_tokenHash_key` (`tokenHash`),
  KEY `ImpersonationGrant_tenant_exp_idx` (`tenantId`, `expiresAt`),
  CONSTRAINT `ImpersonationGrant_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ImpersonationGrant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ImpersonationGrant_superAdminId_fkey` FOREIGN KEY (`superAdminId`) REFERENCES `SuperAdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Plan` ADD COLUMN `maxPublications` INTEGER NOT NULL DEFAULT 50;
UPDATE `Plan` SET `maxPublications` = CASE `code`
  WHEN 'INMOBILIARIA_STARTER' THEN 30
  WHEN 'INMOBILIARIA_PRO' THEN 150
  WHEN 'INMOBILIARIA_ENTERPRISE' THEN 1000
  ELSE `maxPublications`
END;
