# OnlyMob — Production hardening

Estado: release candidate final.

## Cierres aplicados

- RBAC fail-closed y permisos por módulo/acción en actions tenant.
- Contratos con modalidad de ajuste explícita; ICL excluido de aumentos porcentuales masivos.
- Alta de contratos de cochera corregida.
- Feature flags efectivos para portales de inquilino/propietario y automatización, incluso con sesiones existentes.
- Límites SaaS para propiedades, usuarios, publicaciones y cocheras.
- Webhooks con semántica diferenciada para operaciones ganadas/actualizadas y liquidaciones listas/actualizadas.
- `schema.prisma` alineado con migraciones de notificaciones, documentos, integraciones, SaaS e integración 360.
- Seed de planes tipado, sin workaround SQL para `maxPublications`.
- CI ampliado para validar DB limpia, idempotencia, upgrade de DB existente, schema Phase 3/4, tests de hardening, typecheck, build y audit.

## Regla de deploy

`RUN_LEGACY_MIGRATION=false` durante deploys normales. La migración histórica se ejecuta únicamente como proceso de importación explícito y separado.
