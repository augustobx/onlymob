#!/bin/sh
set -e

echo "==> [deploy-migrate] 1. Sincronizando esquema de base de datos con Prisma..."
npx prisma db push --accept-data-loss

echo "==> [deploy-migrate] 2. Sembrando planes y SuperAdmin..."
npx tsx scripts/seed-platform.ts

echo "==> [deploy-migrate] 3. Migrando datos legacy Taurizano..."
npx tsx scripts/migrate-legacy.ts

echo "==> [deploy-migrate] Migración completada exitosamente!"
