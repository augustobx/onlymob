-- Alinea el plano de control SaaS de OnlyMob con el estándar NanoLabs/OnlyERP.
-- Agrega capacidades heredables por plan sin modificar datos tenant-scoped.

CREATE TABLE `PlanFeature` (
  `id` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  `featureKey` VARCHAR(80) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PlanFeature_planId_featureKey_key` (`planId`, `featureKey`),
  INDEX `PlanFeature_planId_idx` (`planId`),
  INDEX `PlanFeature_featureKey_idx` (`featureKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Compatibilidad: todos los planes existentes heredan inicialmente el comportamiento actual (módulos habilitados).
INSERT INTO `PlanFeature` (`id`, `planId`, `featureKey`, `enabled`, `createdAt`)
SELECT UUID(), p.id, f.featureKey, true, CURRENT_TIMESTAMP(3)
FROM `Plan` p
CROSS JOIN (
  SELECT 'analytics' AS featureKey
  UNION ALL SELECT 'integrations'
  UNION ALL SELECT 'owner_portal'
  UNION ALL SELECT 'renter_portal'
  UNION ALL SELECT 'automation'
) f;
