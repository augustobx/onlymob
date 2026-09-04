#!/bin/sh
set -eu

: "${DB_HOST:?DB_HOST is required}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${PLATFORM_HOST:?PLATFORM_HOST is required}"
: "${TENANT_BASE_DOMAIN:?TENANT_BASE_DOMAIN is required}"

export MYSQL_PWD="$MYSQL_PASSWORD"
BASELINE="20260904190000_baseline"

sql() {
  mariadb --protocol=tcp -N -B -h "$DB_HOST" -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "$1"
}

echo "==> [deploy-migrate] Verificando estado de migraciones..."
CORE_TABLE_EXISTS="$(sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'Tenant';")"
MIGRATION_TABLE_EXISTS="$(sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations';")"
BASELINE_APPLIED="0"

if [ "$MIGRATION_TABLE_EXISTS" = "1" ]; then
  BASELINE_APPLIED="$(sql "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '$BASELINE' AND finished_at IS NOT NULL AND rolled_back_at IS NULL;")"
fi

if [ "$CORE_TABLE_EXISTS" = "1" ] && [ "$BASELINE_APPLIED" = "0" ]; then
  echo "==> [deploy-migrate] Base pre-migraciones detectada. Registrando baseline sin alterar datos..."
  npx prisma migrate resolve --applied "$BASELINE"
fi

echo "==> [deploy-migrate] Aplicando migraciones versionadas..."
npx prisma migrate deploy

echo "==> [deploy-migrate] Sincronizando datos de plataforma idempotentes..."
npx tsx scripts/seed-platform.ts

echo "==> [deploy-migrate] Normalizando dominios canónicos de tenants..."
npx tsx scripts/fix-tenant-domains.ts

if [ "${RUN_LEGACY_MIGRATION:-false}" = "true" ]; then
  echo "==> [deploy-migrate] RUN_LEGACY_MIGRATION=true: ejecutando importación legacy explícita..."
  npx tsx scripts/migrate-legacy.ts
else
  echo "==> [deploy-migrate] Migración legacy omitida (comportamiento normal de producción)."
fi

echo "==> [deploy-migrate] Migraciones completadas correctamente."
