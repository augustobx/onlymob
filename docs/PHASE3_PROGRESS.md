# OnlyMob — Fase 3 — Cierre

Estado: implementación completa. Pendiente únicamente la validación CI final y el deploy productivo controlado.

## 3.1–3.2 Mantenimiento e inspecciones

- Proveedores, órdenes, prioridades, presupuestos, costos, responsables y timeline.
- Inspecciones de ingreso/egreso/periódicas, checklist, hallazgos y conversión a mantenimiento.

## 3.3–3.4 Portales

- Portal de inquilino tenant-safe.
- Portal de propietario con acceso, propiedades y liquidaciones.

## 3.5 Comunicación y automatizaciones

- NotificationLog persistente e idempotente.
- Recordatorios de leads, visitas, contratos, ajustes, cuotas, morosidad, pagos, mantenimiento y liquidaciones.
- Endpoint interno protegido para scheduler.

## 3.6 Documentos y plantillas

- Repositorio documental central.
- Plantillas por tenant con variables dinámicas.
- PDFs generados y documentos vinculados a propiedad, contacto, contrato, operación, pago, mantenimiento, liquidación e inspección.

## 3.7 Analytics

- Métricas comerciales, conversión por fuente/agente, tiempos de respuesta y cierre.
- Ocupación, recaudación, deuda/aging, vencimientos, ajustes y liquidaciones.
- Flujo económico por propiedad.
- Mantenimiento, costos por proveedor y performance operativa del equipo.
- Workspace independiente `/analytics` para no penalizar el Dashboard general.

## 3.8 API, webhooks e integraciones

- API versionada `/api/v1` con Bearer tokens hasheados y scopes.
- Propiedades y leads para integraciones/web pública.
- Export CSV de propiedades e import CSV de leads.
- Webhooks HMAC-SHA256 con eventos y log de entregas/fallos.
- Workspace `/integraciones` para administrar claves y endpoints.

## 3.9 SaaS y SuperAdmin

- Planes Starter, Profesional y Enterprise.
- Límites de propiedades, usuarios y publicaciones.
- Trial, active, past-due, suspended y canceled.
- Feature flags por tenant.
- Métricas SaaS, MRR y uso contra límites.
- Historial de cambios de suscripción y auditoría.
- Impersonación de soporte one-shot, hasheada, expirable, consumible una sola vez y auditada.

## 3.10 Calidad final

- Tests unitarios de CSV y aislamiento tenant.
- CI: Prisma validate, tests, migración limpia, idempotencia, upgrade de DB existente, typecheck, build y audit.
- Health/readiness con DB + esquema crítico.
- `.env.example` completo.
- Arquitectura y guía de deploy/rollback documentadas.
- Nuevas interfaces responsive y con labels/semántica básica de accesibilidad.

## Migraciones Fase 3

- `20260905143000_phase3_maintenance_inspections`
- `20260905154000_phase3_notifications_automation`
- `20260905165000_phase3_documents_templates`
- `20260905180000_phase3_integrations_saas`

La migración legacy continúa desactivada durante deploy normal.
