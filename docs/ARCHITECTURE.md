# OnlyMob — Arquitectura productiva

## Topología

`Nginx Proxy Manager / nanoapps-router -> onlymob-web:3000 -> MariaDB`

- Plataforma: `onlymob.nanoapps.ar`.
- Tenants: `<slug>.nanoapps.ar` y dominios verificados en `TenantDomain`.
- Una aplicación SaaS y una base compartida con aislamiento lógico obligatorio por `tenantId`.
- Base y aplicación sin puertos públicos; sólo la app participa de la red externa `proxy`.

## Aislamiento

- `resolveTenantContext()` resuelve el tenant por Host y valida estado del tenant/suscripción.
- `getTenantPrisma()` aplica `tenantId` a lecturas, escrituras y altas.
- La batería `tests/tenant-scope.test.ts` evita regresiones de aislamiento.
- APIs públicas usan credenciales hasheadas ligadas a un tenant y scopes explícitos.

## Módulos

1. Core SaaS, roles, permisos, auditoría y dominios.
2. CRM, agenda, publicaciones, reservas, operaciones, contratos, cobranzas y property management.
3. Mantenimiento, inspecciones, portales, notificaciones, automatizaciones, documentos, analytics, API/webhooks y control SaaS.

## Integraciones

- API versionada `/api/v1` con Bearer tokens y scopes.
- Webhooks salientes HMAC-SHA256 con log de cada entrega.
- CSV de propiedades y carga masiva de leads.
- API de propiedades apta para integrar una web pública del tenant.

## SaaS

- Planes Starter / Profesional / Enterprise.
- Límites de propiedades, usuarios y publicaciones.
- Feature overrides por tenant.
- Trial, active, past-due, suspended y canceled.
- Historial de cambios de suscripción.
- SuperAdmin con métricas, uso, MRR y soporte auditado.
- Impersonación one-shot: token hasheado, 5 minutos, una sola utilización, sesión creada en el host del tenant.

## Operación

- `scripts/deploy-migrate.sh` es la única entrada normal de migraciones.
- La migración legacy está desactivada por defecto y nunca se ejecuta durante un deploy ordinario.
- `/api/health` valida conexión DB y presencia del esquema crítico.
- Automatizaciones se ejecutan mediante `/api/internal/automation/run` con secreto propio.
