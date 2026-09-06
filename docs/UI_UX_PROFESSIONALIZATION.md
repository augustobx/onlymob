# OnlyMob — UI/UX Professionalization

## Objetivo
Unificar el panel administrativo de OnlyMob bajo una única jerarquía visual y de interacción, reduciendo scroll, densidad y formularios inline sin modificar schema ni reglas de negocio.

## Reglas de producto
- Listado primero; creación/edición fuera del flujo principal mediante drawer.
- Máximo 4 KPIs por cabecera de módulo.
- Búsqueda, filtros y acción primaria en una toolbar común.
- Detalle complejo en ficha 360 o drawer master/detail.
- Modal sólo para acciones cortas o confirmaciones.
- Navegación lateral agrupada y colapsable.
- Tablas sólo para información comparativa; cards para entidades y kanban para procesos.
- Formularios largos divididos por secciones semánticas.
- Acciones destructivas siempre visualmente secundarias.
- Responsive sin duplicar funcionalidades.

## Prioridad de intervención
1. CRM: kanban + drawer de lead.
2. Mantenimiento: órdenes/proveedores/inspecciones con alta en drawer.
3. Contratos: contratos separados de procesos masivos.
4. Administración: gastos, recurrentes y liquidaciones por workspace contextual.
5. Contactos: formulario fuera del listado y dividido en secciones.
6. Propiedades: conservar grid + mover alta/edición a experiencia progresiva.
7. Inquilinos y Cobranzas: reducir información visible y privilegiar acción principal.
8. Resto: normalización de espaciados, toolbar, estados y responsive.

## No alcance
- No se cambia Prisma schema.
- No se crean migraciones.
- No se modifica la migración histórica.
- No se cambian reglas financieras ni contractuales.
- No se eliminan módulos ni funciones.
