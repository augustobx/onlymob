# OnlyMob — Plan de profesionalización SaaS

Objetivo: evolucionar OnlyMob desde un sistema sólido de administración de alquileres hacia una plataforma inmobiliaria SaaS integral, preservando las funcionalidades actuales y conectando todo el ciclo comercial, operativo y financiero en un único modelo de datos.

## Principios

- No eliminar funcionalidades útiles existentes.
- Multi-tenant estricto: ninguna lectura o escritura puede cruzar datos entre inmobiliarias.
- No usar `prisma db push --accept-data-loss` en producción.
- Toda migración debe ser versionada, reversible cuando aplique y validable.
- Las operaciones que modifican múltiples entidades deben ser transaccionales.
- Mantener una única fuente de verdad por entidad: propiedad, contacto, propietario, inquilino, operación, contrato, deuda, pago, mantenimiento y documento.
- Los módulos deben relacionarse entre sí; no crear islas funcionales.
- Priorizar flujos completos sobre features sueltas.
- Diseño responsive y consistente para panel administrativo, portales y vistas operativas.

---

# Fase 1 — Núcleo, seguridad y modelo inmobiliario profesional

## 1.1 Hardening SaaS

- Reemplazar el deploy actual basado en `prisma db push --accept-data-loss` por migraciones Prisma versionadas.
- Separar claramente:
  - bootstrap inicial;
  - migración legacy;
  - migraciones normales de producción;
  - seed de plataforma;
  - seed demo/desarrollo.
- Hacer la migración legacy explícita e idempotente; nunca ejecutarla automáticamente en cada deploy.
- Revisar Dockerfile, Compose, healthcheck, logs, secretos, shutdown y dependencias.
- Agregar validación de variables obligatorias al inicio.
- Eliminar cualquier secret por defecto en producción.
- Agregar auditoría de seguridad y eventos administrativos.

## 1.2 Aislamiento multi-tenant

- Centralizar acceso a datos tenant-scoped.
- Toda operación `create/update/delete/upsert` debe validar tenant.
- Validar pertenencia tenant en relaciones recibidas por ID: propiedad, inquilino, propietario, cochera, plaza, contrato, deuda, pago, tarea, mantenimiento, etc.
- Evitar escrituras directas con `platformPrisma` cuando correspondan al plano tenant.
- Revisar sesiones para que usuario, renter y tenant actual coincidan.
- Agregar pruebas explícitas de aislamiento entre tenants.

## 1.3 Roles y permisos

Evolucionar `ADMIN/STAFF` hacia roles y permisos configurables:

- OWNER / ADMIN
- MANAGER
- AGENT
- COLLECTIONS
- MAINTENANCE
- ACCOUNTING
- READ_ONLY

Permisos por módulo y acción: read/create/update/delete/export/manage.

## 1.4 Modelo de propiedades

Mantener los campos actuales y ampliar `Property` para que soporte administración, alquiler y venta:

- código interno;
- tipo y subtipo;
- operación: alquiler / venta / temporal / administración;
- estado comercial y estado operativo separados;
- dirección completa;
- localidad, provincia, país, CP;
- latitud/longitud;
- ambientes, dormitorios, baños, cocheras;
- superficies total/cubierta/semicubierta/terreno;
- antigüedad;
- orientación;
- amenities/características;
- descripción pública e interna;
- precio, moneda, expensas, comisión;
- precio de alquiler y depósito;
- disponibilidad;
- etiquetas;
- portada y galería multimedia;
- documentación;
- fecha de captación;
- agente responsable;
- fuente de captación;
- métricas de publicación y comercialización.

## 1.5 Propietarios y contactos

Crear una entidad de contacto unificada capaz de representar:

- prospecto;
- comprador;
- interesado en alquiler;
- inquilino;
- propietario;
- garante;
- proveedor;
- contacto general.

Agregar propietario de inmueble como relación real:

- uno o varios propietarios;
- porcentaje de titularidad;
- datos fiscales/bancarios;
- preferencias de liquidación;
- documentos;
- historial de propiedades y operaciones.

Mantener compatibilidad con `PropertyRenter` durante la migración y converger gradualmente hacia el modelo unificado sin perder datos.

## 1.6 Integridad y auditoría

- `AuditLog` tenant-scoped.
- timestamps consistentes.
- soft-delete/archivado donde exista información histórica.
- índices por tenant, estados, vencimientos y búsquedas frecuentes.
- operaciones críticas en `$transaction`.
- numeraciones correlativas robustas para recibos/documentos.

### Criterio de cierre Fase 1

- Build limpio.
- Migraciones versionadas funcionando desde base vacía.
- Migración legacy separada del deploy normal.
- Ninguna escritura tenant-scoped sin validación de tenant.
- Suite mínima de pruebas de aislamiento y flujos existentes.
- Todas las funciones actuales siguen operativas.

---

# Fase 2 — CRM inmobiliario + operaciones + administración integral

## 2.1 CRM y leads

Crear un CRM conectado a propiedades y agentes:

- Lead / Opportunity.
- origen del lead;
- canal de contacto;
- agente responsable;
- prioridad;
- score opcional;
- estado/pipeline;
- historial de interacciones;
- notas;
- archivos;
- próximos pasos;
- fecha última interacción;
- SLA de respuesta.

Pipeline sugerido:

1. Nuevo
2. Contactado
3. Calificado
4. Propiedades enviadas
5. Visita agendada
6. Visitó
7. Negociación
8. Reserva
9. Cerrado ganado
10. Cerrado perdido

## 2.2 Demandas y matching

Guardar búsquedas reales de clientes:

- operación;
- tipo de propiedad;
- zonas;
- presupuesto;
- moneda;
- ambientes/dormitorios;
- superficie;
- amenities;
- condiciones excluyentes.

Crear matching demanda ↔ propiedades con ranking simple y explicable.

Desde un lead/contacto se debe poder:

- ver propiedades compatibles;
- enviar selección;
- registrar respuesta;
- agendar visita;
- convertir a oportunidad/reserva.

## 2.3 Agenda, tareas y visitas

Separar Tareas de Eventos:

- tarea con vencimiento y responsable;
- evento con fecha/hora y ubicación;
- visita vinculada a propiedad, lead/contacto y agente;
- recordatorios;
- tareas recurrentes;
- vista agenda/calendario;
- tareas vencidas y próximas;
- actividad dentro de cada ficha.

## 2.4 Publicación y catálogo comercial

Crear módulo Listing/Publication:

- ficha pública de propiedad;
- estado de publicación;
- fecha alta/baja;
- calidad/completitud de ficha;
- portales/canales configurados;
- URL publicada;
- métricas básicas;
- historial de cambios;
- publicación masiva preparada mediante adapters.

No acoplar directamente el dominio a un proveedor. Crear adapters para:

- sitio propio;
- portales externos;
- feeds/API futuras;
- importación de consultas/leads.

## 2.5 Reservas y operaciones

Crear flujo comercial completo:

- reserva;
- importe;
- moneda;
- estado;
- vencimiento;
- documentos;
- interesado;
- propiedad;
- agente;
- condiciones;
- comisión;
- historial.

Crear `Deal/Operation` para venta o alquiler y conectar el cierre con:

- propiedad;
- contacto(s);
- propietario(s);
- agente(s);
- reserva;
- documentación;
- comisión;
- contrato cuando corresponda.

## 2.6 Contratos de alquiler

Preservar lo existente y profesionalizarlo:

- renovaciones;
- prórrogas;
- garantías;
- garantes;
- ajustes programados;
- reglas de índice;
- historial de aumentos;
- alertas de vencimiento;
- checklist de ingreso/egreso;
- depósito;
- inventario/documentación;
- estado contractual más rico.

La lógica BCRA/ICL existente debe mantenerse como una opción, no quedar embebida como única modalidad de actualización.

## 2.7 Cobranzas y administración

Preservar deudas/pagos actuales y ampliar:

- cargos recurrentes;
- alquiler;
- expensas;
- impuestos/servicios;
- seguros;
- penalidades/intereses;
- depósitos;
- notas de crédito/débito;
- pagos parciales;
- conciliación;
- recibos;
- cuenta corriente por inquilino y contrato.

Agregar gastos de propiedad:

- proveedor;
- categoría;
- propiedad;
- propietario;
- comprobante;
- vencimiento;
- estado de pago;
- repercutible al inquilino o propietario.

## 2.8 Liquidación a propietarios

- período;
- alquileres cobrados;
- gastos;
- comisión de administración;
- impuestos/retenciones configurables;
- saldo propietario;
- estado de liquidación;
- documentos;
- historial;
- comprobante/resumen descargable.

### Criterio de cierre Fase 2

Debe poder ejecutarse un flujo completo:

captación de propiedad → publicación → lead → seguimiento → visita → reserva → operación/contrato → deuda → pago → liquidación propietario.

Todo debe quedar vinculado e historizado.

---

# Fase 3 — Mantenimiento, portales, automatización, métricas e integraciones

## 3.1 Mantenimiento y órdenes de trabajo

Crear módulo Maintenance:

- solicitud del inquilino;
- propiedad/unidad;
- categoría;
- prioridad;
- fotos/documentos;
- estado;
- responsable;
- proveedor;
- presupuesto;
- autorización;
- costo real;
- quién absorbe el costo;
- notas y timeline;
- fecha prometida y cierre.

Crear proveedores con:

- rubros;
- contacto;
- CUIT;
- documentación;
- histórico de trabajos;
- costos;
- valoración interna.

## 3.2 Inspecciones

- ingreso;
- egreso;
- periódicas;
- checklist configurable;
- fotos;
- observaciones;
- firma/aceptación futura;
- comparación entre inspecciones;
- creación de mantenimiento desde hallazgos.

## 3.3 Portal del inquilino

Ampliar portal existente:

- contratos;
- documentos;
- cuenta corriente;
- pagos/recibos;
- próximos vencimientos;
- mantenimiento;
- mensajes;
- actualización de datos;
- notificaciones;
- historial de solicitudes.

## 3.4 Portal del propietario

Crear portal propietario:

- propiedades administradas;
- ocupación;
- contratos;
- ingresos;
- gastos;
- liquidaciones;
- documentos;
- mantenimiento;
- reportes;
- historial de pagos/liquidaciones.

## 3.5 Comunicación y automatizaciones

Crear sistema de notificaciones provider-agnostic:

- email;
- WhatsApp mediante proveedor configurable;
- notificación interna;
- futura push PWA.

Automatizaciones iniciales:

- lead nuevo;
- lead sin respuesta;
- recordatorio de visita;
- contrato por vencer;
- ajuste próximo;
- cuota generada;
- cuota próxima a vencer;
- deuda vencida;
- pago registrado;
- mantenimiento actualizado;
- liquidación disponible.

Guardar `NotificationLog` y evitar duplicados.

## 3.6 Documentos y plantillas

- repositorio documental central;
- categorías;
- documentos por propiedad/contacto/contrato/operación/pago/mantenimiento;
- plantillas;
- variables dinámicas;
- generación de documentos PDF;
- preparado para integración futura de firma electrónica.

## 3.7 Analytics

Dashboard ejecutivo con:

### Comercial
- leads por fuente;
- tiempo medio de primera respuesta;
- conversión por agente;
- conversión por fuente;
- visitas;
- reservas;
- cierres;
- días promedio en mercado.

### Administración
- ocupación/vacancia;
- alquiler mensual esperado;
- cobrado;
- morosidad;
- aging de deuda;
- contratos por vencer;
- ajustes próximos;
- gastos por propiedad;
- rentabilidad/flujo por propiedad;
- liquidaciones pendientes.

### Operación
- mantenimiento abierto;
- tiempo medio de resolución;
- costo por propiedad/proveedor;
- tareas vencidas;
- performance del equipo.

## 3.8 API, webhooks e integraciones

- API interna versionada.
- webhooks de eventos relevantes.
- adapters para portales y medios de comunicación.
- import/export CSV.
- integración con web pública del tenant.
- preparada para sincronización futura con portales inmobiliarios.

## 3.9 SaaS y SuperAdmin

Profesionalizar plataforma:

- planes reales;
- feature flags;
- límites por plan;
- cantidad de usuarios/propiedades/publicaciones;
- trial;
- suspensión;
- historial de suscripción;
- uso del tenant;
- auditoría;
- soporte/impersonación segura y auditada;
- estado de servicios;
- métricas SaaS.

## 3.10 Calidad final

- pruebas unitarias de dominio crítico;
- pruebas de integración;
- pruebas multi-tenant;
- smoke tests principales;
- lint/typecheck/build en CI;
- documentación de arquitectura;
- `.env.example` completo y sin secretos;
- guía de deploy y rollback;
- health/readiness confiables;
- revisión responsive y accesibilidad básica.

### Criterio de cierre Fase 3

OnlyMob debe quedar como una plataforma SaaS inmobiliaria integral, usable para gestión comercial y administración de alquileres, con portales de cliente/propietario, mantenimiento, automatizaciones y métricas conectadas al mismo núcleo de datos.
