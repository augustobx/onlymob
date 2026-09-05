CREATE TABLE `NotificationLog` (
  `id` VARCHAR(36) NOT NULL,
  `tenantId` VARCHAR(36) NOT NULL,
  `eventKey` VARCHAR(100) NOT NULL,
  `channel` VARCHAR(20) NOT NULL DEFAULT 'INTERNAL',
  `audienceType` VARCHAR(20) NOT NULL DEFAULT 'TENANT',
  `recipientRefId` VARCHAR(36) NULL,
  `recipientAddress` VARCHAR(190) NULL,
  `title` VARCHAR(180) NOT NULL,
  `body` TEXT NOT NULL,
  `metadata` LONGTEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'SENT',
  `dedupeKey` VARCHAR(191) NOT NULL,
  `scheduledFor` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `readAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `failureMessage` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `NotificationLog_tenant_channel_dedupe_key` (`tenantId`, `channel`, `dedupeKey`),
  KEY `NotificationLog_tenant_status_created_idx` (`tenantId`, `status`, `createdAt`),
  KEY `NotificationLog_recipient_status_created_idx` (`tenantId`, `recipientRefId`, `status`, `createdAt`),
  KEY `NotificationLog_event_created_idx` (`tenantId`, `eventKey`, `createdAt`),
  CONSTRAINT `NotificationLog_tenantId_fkey`
    FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
