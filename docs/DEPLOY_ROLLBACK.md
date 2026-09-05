# OnlyMob — Deploy y rollback

## Deploy normal

1. No importar legacy y no eliminar volúmenes.
2. Actualizar `main` con fast-forward.
3. Verificar secretos requeridos de runtime.
4. Ejecutar `docker compose up -d --build`.
5. El servicio `migrate` aplica migraciones versionadas, seed idempotente y normalización de dominios.
6. Revisar logs de `migrate`, `web`, `docker compose ps` y `/api/health`.
7. Hacer un único smoke funcional sobre datos de prueba.

## Migración legacy

`RUN_LEGACY_MIGRATION=false` es obligatorio en operación normal. La importación histórica se ejecuta sólo como procedimiento supervisado después de congelar el schema definitivo.

## Rollback de aplicación

Si una versión nueva falla antes de haber generado datos incompatibles:

1. Conservar la base y los volúmenes.
2. Identificar el commit estable anterior.
3. Volver el working tree a ese commit de forma controlada.
4. Reconstruir únicamente la aplicación.

Las migraciones de Fase 3 son aditivas. No intentar `migrate reset`, `down -v`, borrar tablas ni revertir SQL manualmente en producción.

## Verificaciones mínimas

- `docker compose ps`: DB saludable, web activa, migrator finalizado correctamente.
- `/api/health`: HTTP 200 con `status=ready`, `database=ok`, `schema=ready`.
- Login tenant y SuperAdmin.
- Propiedades históricas intactas.
- `/analytics`, `/integraciones`, `/documentos`, `/mantenimiento`, `/notificaciones`.
- Portales de inquilino y propietario.

## Secretos

Nunca commitear `.env`. Los secretos de automation y webhooks deben ser aleatorios y diferentes de `AUTH_SECRET`.
