# OnlyMob — Fase 4 y Fase 5

## Objetivo

Cerrar OnlyMob como producto inmobiliario integral antes de la migración legacy definitiva. La Fase 4 unifica operación, eventos, comunicaciones, finanzas, permisos e integraciones. La Fase 5 reemplaza la presentación actual por un sistema visual SaaS profesional, manteniendo intacto el dominio.

## Fase 4 — Integración real y operación 360

### 4.1 Propiedad 360
- Resumen ejecutivo de propiedad, estado comercial/operativo, agente y precios.
- Propietarios y porcentajes.
- Inquilino y contrato actual + historial contractual.
- Cuenta corriente, deuda y pagos.
- Publicaciones, leads/intereses, visitas, reservas y operaciones.
- Gastos, liquidaciones y flujo económico.
- Mantenimiento, inspecciones, proveedores y costos.
- Documentos.
- Timeline único de actividad.

### 4.2 Contacto 360
- Identidad, roles y datos fiscales/bancarios.
- Propiedades, contratos, leads, demandas, operaciones y agenda.
- Deudas/pagos cuando corresponda.
- Liquidaciones, gastos, mantenimiento y documentos relacionados.
- Timeline único.

### 4.3 Event bus / Activity Stream
- `ActivityEvent` tenant-scoped.
- Los eventos se originan desde la misma capa de auditoría de las mutaciones.
- Mapeo de acciones de dominio a eventos públicos.
- Cola de webhooks sin bloquear la operación del usuario.
- Timeline 360 alimentado por eventos persistentes.

### 4.4 Comunicaciones
- Hilos vinculables a propiedad/contacto/inquilino.
- Mensajes INTERNAL / EMAIL / WHATSAPP.
- Inbox administrativo.
- Mensajes visibles en portal de inquilino/propietario.
- Dispatcher provider-agnostic para canales externos configurados.
- Estados queued/sent/delivered/read/failed.

### 4.5 Webhooks e integraciones
- Eventos automáticos desde el event bus.
- Cola y reintentos de deliveries.
- Firma HMAC.
- Historial de intentos y errores.

### 4.6 RBAC
- `read/create/update/delete/export/manage` por módulo.
- Mantener compatibilidad temporal de ADMIN con acceso total.
- Nuevos módulos 360/comunicaciones/finanzas protegidos desde su capa server.
- Migración progresiva de acciones legacy hacia `requirePermission` antes del cierre de Fase 4.

### 4.7 Finanzas
- Cajas/cuentas bancarias/billeteras.
- Ingresos, egresos, transferencias y ajustes.
- Vínculos con propiedad, contacto, deuda, pago, gasto y liquidación.
- Estado de conciliación.
- Trazabilidad financiera por propiedad.

### 4.8 Workflow documental
- draft/generated/sent/viewed/signed/archived.
- versión, timestamps y trazabilidad.
- adapter preparado para proveedor de firma.

### 4.9 Portales
- Comunicaciones reales.
- Documentos/recibos descargables.
- Mantenimiento y seguimiento.
- Propietario: ingresos, gastos, liquidaciones y actividad.

### 4.10 Cierre
- Flujo end-to-end validado desde captación hasta liquidación/mantenimiento.
- Multi-tenant y permisos verificados.
- Sin islas funcionales.

## Fase 5 — Rediseño visual profesional

### 5.1 Design system
- Superficies, tipografía, espaciado, radios, sombras y estados coherentes.
- Tokens CSS y componentes reutilizables.

### 5.2 App shell
- Sidebar más clara y compacta.
- Topbar útil, breadcrumbs, búsqueda global y acciones rápidas.
- Responsive real.

### 5.3 Dashboard
- Jerarquía ejecutiva, KPIs, alertas y actividad.

### 5.4 Fichas 360
- Property / Contact / Contract / Operation / Maintenance con cabecera, KPIs, tabs, timeline y acciones contextuales.

### 5.5 Formularios/búsqueda
- Autocomplete como estándar para entidades grandes.
- Estados de validación y feedback consistentes.

### 5.6 Tablas/listados
- Toolbars, filtros, chips, paginación y densidad profesional.

### 5.7 Responsive/accesibilidad
- Navegación móvil, foco, contraste, labels y semántica.

### 5.8 Polish final
- Loading/empty/error states.
- Consistencia visual completa antes de congelar producto.

## Regla de despliegue

No ejecutar migración legacy durante Fase 4/5. Todas las migraciones son aditivas. Cuando ambas fases queden validadas en producción se congela el schema y recién entonces se transforma/importa la base histórica.