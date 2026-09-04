# OnlyMob — Verificación local Fase 1

Este documento cubre la prueba de la Fase 1 antes de integrar a `main` o desplegar en producción.

## 1. Preparar entorno

Trabajar sobre la rama:

```bash
git checkout feat/professionalizacion-saas
git pull
```

Copiar `.env.example` a `.env` y reemplazar todos los valores `CHANGE_ME`.

Requisitos mínimos:

- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `DATABASE_URL`
- `PLATFORM_HOST`
- `TENANT_BASE_DOMAIN`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_SECRET` de al menos 32 caracteres aleatorios
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD` de al menos 12 caracteres

Mantener:

```env
RUN_LEGACY_MIGRATION=false
```

en pruebas normales y producción. La importación legacy sólo se habilita de forma explícita para una migración supervisada.

## 2. Prueba desde base vacía

Eliminar únicamente el stack/local volume de prueba si se desea comprobar bootstrap completo.

```bash
docker compose down -v
docker compose up -d --build
```

Comprobar:

```bash
docker compose ps
docker compose logs migrate --tail=200
docker compose logs web --tail=200
```

Resultado esperado:

- MariaDB `healthy`.
- `migrate` finaliza con código 0.
- Se aplican `20260904190000_baseline` y `20260904193000_phase1_professional_core`.
- El seed de plataforma termina correctamente.
- La migración legacy aparece como omitida.
- `web` queda `healthy`.

## 3. Comprobar idempotencia

Sin borrar la base:

```bash
docker compose run --rm migrate
```

Resultado esperado:

```text
No pending migrations to apply.
```

El seed puede ejecutarse nuevamente sin duplicar planes, roles ni permisos.

## 4. Smoke test funcional

Ingresar como SuperAdmin y validar:

1. Crear una inmobiliaria nueva con una contraseña inicial de 12+ caracteres.
2. Abrir el tenant creado.
3. Ingresar con su usuario administrador.
4. Crear y editar una propiedad.
5. Crear un contacto con rol Propietario.
6. Crear un inquilino.
7. Crear una cochera y plazas.
8. Crear un contrato de propiedad.
9. Generar cuotas mensuales dos veces para el mismo período: la segunda ejecución no debe duplicar deudas.
10. Registrar un pago parcial y luego completar el saldo.
11. Verificar numeración de recibos correlativa.
12. Editar Configuraciones, recargar la página y confirmar persistencia.
13. Ingresar al Portal del Inquilino y comprobar contrato, deuda e historial de pagos.

## 5. Aislamiento multi-tenant

Crear dos tenants de prueba, A y B.

Validar que:

- usuario de A no pueda operar recursos de B alterando IDs;
- una propiedad de B no pueda ser usada en un contrato de A;
- un inquilino de B no pueda ser asociado a un contrato de A;
- una plaza de cochera de B no pueda ser asociada a un contrato de A;
- un contacto de B no pueda ser propietario de una propiedad de A;
- una sesión de Portal del Inquilino sólo sea válida en el dominio de su propio tenant.

Las operaciones rechazadas no deben dejar registros parciales.

## 6. Migrar una base existente

Nunca probar primero sobre la única copia productiva.

Antes de ejecutar una migración sobre datos reales:

1. generar dump completo;
2. restaurarlo en una base de ensayo;
3. usar el mismo código/variables que producción;
4. ejecutar el servicio `migrate`;
5. comprobar conteos y datos críticos;
6. ejecutar el smoke test.

El entrypoint detecta una base OnlyMob previa sin el baseline registrado, marca `20260904190000_baseline` como aplicado **sin recrear tablas ni borrar información** y aplica luego las migraciones pendientes.

## 7. Validaciones automáticas

El workflow `.github/workflows/ci.yml` verifica en cada cambio:

- instalación reproducible con `npm ci`;
- generación Prisma;
- `prisma validate`;
- bootstrap desde MariaDB vacía;
- segundo deploy idempotente;
- upgrade de una base pre-Prisma simulada;
- TypeScript;
- build de producción;
- auditoría de vulnerabilidades high en dependencias de producción.

No integrar la Fase 1 a `main` mientras este workflow no esté completamente verde.
