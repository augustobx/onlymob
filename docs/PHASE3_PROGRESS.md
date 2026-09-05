# OnlyMob — Fase 3 — Progreso

Rama de trabajo: `feat/phase3-platform`

Esta fase se desarrolla completa antes del deploy productivo. No ejecutar migración legacy ni resetear datos durante este trabajo.

## 3.1 Mantenimiento y proveedores

Estado: implementado en rama, pendiente validación integral de Fase 3.

- `ProviderProfile` conectado a `Contact` con rol `PROVIDER`.
- Órdenes `MaintenanceRequest` tenant-scoped.
- Prioridad, estado, categoría, responsable interno y proveedor.
- Presupuesto, importe aprobado, costo real y responsable del costo.
- Fechas de programación, compromiso, inicio y resolución.
- Timeline `MaintenanceEvent` con cambios de estado y notas.
- Documentos preparados para vincularse a una orden.
- Workspace `/mantenimiento` con alta y seguimiento.

## 3.2 Inspecciones

Estado: implementado en rama, pendiente validación integral de Fase 3.

- Inspecciones de ingreso, egreso, periódicas y otras.
- Estado, inspector, contrato, propiedad e inquilino.
- Checklist y resumen.
- Hallazgos con severidad y fotos preparadas.
- Conversión de hallazgo a orden de mantenimiento.
- Documentos preparados para vincularse a inspecciones.

## Integración

- Ruta `/mantenimiento` protegida por sesión tenant.
- Navegación administrativa actualizada.
- Módulo `maintenance` agregado a permisos y perfiles de rol.
- Nuevos modelos incluidos en el Prisma tenant-scoped client.
- Migración Prisma aditiva: `20260905143000_phase3_maintenance_inspections`.

## Pendiente de Fase 3

- 3.3 Portal del inquilino.
- 3.4 Portal del propietario.
- 3.5 Comunicación y automatizaciones.
- 3.6 Documentos y plantillas.
- 3.7 Analytics.
- 3.8 API, webhooks e integraciones.
- 3.9 SaaS y SuperAdmin.
- 3.10 Calidad final.
