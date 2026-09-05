#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
if [ ! -f .env ]; then echo "OnlyMob .env no encontrado" >&2; exit 1; fi
set -a
. ./.env
set +a
: "${AUTOMATION_CRON_SECRET:?AUTOMATION_CRON_SECRET no configurado}"
: "${PLATFORM_HOST:?PLATFORM_HOST no configurado}"
curl -fsS --max-time 120 -X POST -H "Authorization: Bearer ${AUTOMATION_CRON_SECRET}" "https://${PLATFORM_HOST}/api/internal/automation/run"
printf '\n'
