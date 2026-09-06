'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, HelpCircle, Info, Lightbulb, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

type HelpDefinition = {
  path: string;
  title: string;
  purpose: string;
  steps: string[];
  impact?: string[];
  tips?: string[];
};

const HELP: HelpDefinition[] = [
  {
    path: '/rapidos/alquileres',
    title: 'Alquileres rápidos',
    purpose: 'Es la vista operativa para controlar de un vistazo qué alquileres están al día y cuáles tienen deuda vencida, y cobrar sin salir de la pantalla.',
    steps: [
      'Revisá las tarjetas: verde significa al día y naranja indica deuda vencida.',
      'Abrí Cobrar sobre un alquiler para ver sus deudas pendientes.',
      'Registrá el pago total o parcial, elegí el medio de pago y confirmá.',
      'Imprimí o reimprimí el recibo directamente desde el mismo modal.',
    ],
    impact: ['El pago actualiza la deuda y el estado del alquiler inmediatamente.', 'Los recibos quedan asociados al pago y disponibles para reimpresión.'],
    tips: ['Usá esta pantalla para la cobranza diaria; Cobranzas queda como vista administrativa completa.'],
  },
  {
    path: '/impresion/recibos',
    title: 'Impresión de recibos',
    purpose: 'Permite preparar e imprimir en lote los recibos registrados durante un mes determinado.',
    steps: [
      'Elegí el mes y año que querés imprimir.',
      'Revisá los recibos incluidos en el lote.',
      'Elegí 8 recibos por hoja para formato compacto o 6 si necesitás más espacio.',
      'Abrí la vista de impresión y enviá el lote a la impresora o PDF.',
    ],
    impact: ['No genera pagos nuevos: imprime únicamente recibos de pagos que ya existen.', 'La impresión masiva no modifica saldos ni contratos.'],
  },
  {
    path: '/dashboard',
    title: 'Dashboard',
    purpose: 'Resume el estado general de la inmobiliaria y concentra los indicadores que requieren atención inmediata.',
    steps: [
      'Revisá los indicadores principales de cartera, contratos, cobranzas y operación.',
      'Usá los accesos directos para entrar al módulo que requiere trabajo.',
      'Tomá los avisos y vencimientos como punto de partida de la jornada.',
    ],
    impact: ['Es una vista de consulta: los cambios se realizan dentro de cada módulo operativo.'],
  },
  {
    path: '/analytics',
    title: 'Analytics',
    purpose: 'Concentra métricas comerciales, administrativas y financieras para analizar rendimiento y evolución de la inmobiliaria.',
    steps: [
      'Elegí el período que querés analizar cuando la vista lo permita.',
      'Compará evolución de operaciones, ocupación, cobranzas y cartera.',
      'Usá los indicadores para detectar desvíos y oportunidades.',
    ],
    impact: ['La información se calcula con los datos cargados en los distintos módulos; no modifica registros.'],
  },
  {
    path: '/crm',
    title: 'CRM',
    purpose: 'Organiza prospectos y oportunidades comerciales desde el primer contacto hasta el cierre o pérdida de la operación.',
    steps: [
      'Creá el lead y cargá qué busca, presupuesto, prioridad y origen.',
      'Movelo por las etapas del tablero a medida que avanza.',
      'Registrá llamadas, WhatsApp, notas, propiedades enviadas y visitas.',
      'Cuando la operación avance, vinculá reserva y negocio para mantener el historial completo.',
    ],
    impact: ['Alimenta Agenda, Operaciones, actividad 360 y métricas comerciales.'],
    tips: ['No uses Contactos como reemplazo del CRM: el contacto identifica a la persona; el lead representa la oportunidad comercial.'],
  },
  {
    path: '/agenda',
    title: 'Agenda',
    purpose: 'Centraliza visitas, reuniones, llamadas y compromisos del equipo.',
    steps: [
      'Creá un evento indicando fecha, hora, tipo y responsable.',
      'Vinculalo a una propiedad, lead o contacto cuando corresponda.',
      'Marcá el resultado como completado, cancelado o ausente.',
    ],
    impact: ['Los eventos vinculados forman parte del seguimiento comercial y operativo.'],
  },
  {
    path: '/propiedades',
    title: 'Propiedades',
    purpose: 'Es el inventario central de inmuebles administrados o comercializados por la inmobiliaria.',
    steps: [
      'Creá la propiedad con dirección, tipo, operación, valores y características.',
      'Asigná propietarios y completá la información comercial.',
      'Desde su ficha consultá contratos, interesados, documentos, gastos y actividad.',
      'Actualizá el estado comercial para reflejar disponibilidad, reserva o cierre.',
    ],
    impact: ['Las propiedades se relacionan con contratos, CRM, publicaciones, mantenimiento, documentos y finanzas.'],
  },
  {
    path: '/operaciones',
    title: 'Operaciones',
    purpose: 'Gestiona reservas y negocios de compra, venta o alquiler que ya avanzaron más allá del seguimiento inicial del CRM.',
    steps: [
      'Creá o revisá la reserva vinculada a una propiedad y cliente.',
      'Controlá importe, vencimiento y estado de la reserva.',
      'Gestioná el negocio hasta negociación, ganado, perdido o cancelado.',
    ],
    impact: ['El cierre de una operación queda vinculado a propiedad, contacto, agente y actividad comercial.'],
  },
  {
    path: '/contactos',
    title: 'Contactos',
    purpose: 'Mantiene una única ficha para personas y empresas relacionadas con la inmobiliaria: propietarios, compradores, garantes, proveedores y otros.',
    steps: [
      'Creá o buscá el contacto antes de duplicarlo.',
      'Asignale uno o más roles según su relación con la inmobiliaria.',
      'Completá teléfono, email, empresa y datos relevantes.',
      'Usá su ficha para consultar relaciones y actividad asociada.',
    ],
    impact: ['Un mismo contacto puede participar en propiedades, contratos, CRM, mantenimiento y comunicaciones.'],
  },
  {
    path: '/inquilinos',
    title: 'Inquilinos',
    purpose: 'Administra las personas que pueden ser titulares de contratos de inmueble o cochera y acceder al portal del inquilino.',
    steps: [
      'Creá el inquilino con DNI y datos de contacto.',
      'Asignalo al generar un contrato de inmueble o cochera.',
      'Configurá su acceso al portal cuando corresponda.',
      'Consultá sus contratos, deudas y pagos desde los módulos relacionados.',
    ],
    impact: ['El inquilino se vincula con contratos, deudas, pagos, mantenimiento, documentos y comunicaciones.'],
  },
  {
    path: '/contratos',
    title: 'Contratos',
    purpose: 'Administra los contratos vigentes e históricos de inmuebles y cocheras, sus valores, fechas y reglas de actualización.',
    steps: [
      'Elegí Inmueble o Cochera y creá el contrato con titular, vigencia y valores.',
      'Definí la modalidad y periodicidad de aumento cuando corresponda.',
      'Generá las cuotas mensuales para crear las deudas del período.',
      'Finalizá el contrato desde aquí cuando termine la relación contractual.',
    ],
    impact: ['Un contrato vigente determina ocupación, alquiler actual, deudas, aumentos y estado del inmueble o plaza.'],
    tips: ['No marques una cochera como ocupada manualmente: la ocupación se produce al crear su contrato.'],
  },
  {
    path: '/aumentos',
    title: 'Aumentos',
    purpose: 'Controla los próximos ajustes de alquiler y permite simular y aplicar aumentos individuales o por grupo.',
    steps: [
      'Revisá qué contratos tienen ajuste próximo o vencido.',
      'Filtrá o agrupá los contratos que querés actualizar.',
      'Simulá el nuevo valor antes de confirmar.',
      'Aplicá el ajuste para actualizar el alquiler y registrar el historial.',
    ],
    impact: ['Cada aplicación actualiza el alquiler vigente, registra RentHistory y calcula la próxima fecha de ajuste.', 'Los aumentos automáticos se habilitan desde Configuración y además por contrato.'],
    tips: ['Siempre revisá la simulación antes de aplicar un lote.'],
  },
  {
    path: '/cobranzas',
    title: 'Cobranzas',
    purpose: 'Gestiona deudas, pagos y recibos de inquilinos de inmuebles y cocheras.',
    steps: [
      'Buscá la deuda pendiente del inquilino.',
      'Registrá el importe cobrado, medio de pago y referencia.',
      'El sistema actualiza automáticamente pago total o parcial.',
      'Abrí el recibo para imprimirlo o consultarlo nuevamente.',
    ],
    impact: ['Los pagos reducen el saldo de la deuda y alimentan recibos, finanzas y estado de cuenta.'],
  },
  {
    path: '/finanzas',
    title: 'Finanzas',
    purpose: 'Centraliza cuentas y movimientos financieros para conciliar ingresos, egresos y ajustes con la operación real.',
    steps: [
      'Configurá las cuentas financieras que utiliza la inmobiliaria.',
      'Revisá ingresos y egresos generados o cargados manualmente.',
      'Conciliá los movimientos con pagos, gastos u operaciones cuando corresponda.',
    ],
    impact: ['Permite separar el movimiento de dinero de la deuda administrativa y mantener trazabilidad contable.'],
  },
  {
    path: '/administracion',
    title: 'Liquidaciones',
    purpose: 'Prepara la rendición económica a propietarios, mostrando ingresos, gastos, comisiones y neto a liquidar.',
    steps: [
      'Elegí propietario y período de liquidación.',
      'Revisá alquileres cobrados y conceptos que deben descontarse.',
      'Controlá comisión, gastos y neto final.',
      'Marcá la liquidación según su estado operativo hasta quedar pagada.',
    ],
    impact: ['Relaciona cobranzas, gastos de propiedades y movimientos administrativos del propietario.'],
  },
  {
    path: '/cocheras',
    title: 'Cocheras',
    purpose: 'Administra garajes, plazas disponibles y contratos de alquiler de cochera desde un mapa visual.',
    steps: [
      'Elegí un garaje y revisá sus plazas libres, alquiladas o en mantenimiento.',
      'Hacé click en una plaza libre para abrir el alta real del contrato.',
      'Seleccioná inquilino, fechas, plazas, alquiler y depósito y confirmá.',
      'Hacé click en una plaza alquilada para consultar o finalizar su contrato.',
    ],
    impact: ['Una plaza sólo queda ocupada mediante un contrato vigente.', 'Al finalizar el contrato sus plazas vuelven a quedar libres.'],
    tips: ['Si aparece “Sin contrato”, es una ocupación heredada/inconsistente: creá el contrato correcto o liberá la plaza.'],
  },
  {
    path: '/mantenimiento',
    title: 'Mantenimiento',
    purpose: 'Registra y sigue reclamos, reparaciones y trabajos sobre propiedades desde su apertura hasta la resolución.',
    steps: [
      'Creá el pedido indicando propiedad, problema y prioridad.',
      'Asigná responsable o proveedor y registrá presupuesto cuando exista.',
      'Actualizá el estado a medida que avanza el trabajo.',
      'Cerrá el pedido con costo real y observaciones finales.',
    ],
    impact: ['El historial queda vinculado a propiedad, inquilino, contrato, proveedor y actividad 360.'],
  },
  {
    path: '/documentos',
    title: 'Documentos',
    purpose: 'Centraliza contratos, recibos, actas, reservas y archivos relacionados con la operación de la inmobiliaria.',
    steps: [
      'Buscá o filtrá el documento por categoría y vínculo.',
      'Cargá documentos y asociálos a la entidad correspondiente.',
      'Usá plantillas cuando necesites generar documentación repetitiva.',
      'Consultá estado de envío, visualización o firma cuando aplique.',
    ],
    impact: ['Los documentos pueden quedar relacionados con propiedades, inquilinos, contratos, pagos, inspecciones y operaciones.'],
  },
  {
    path: '/comunicaciones',
    title: 'Comunicaciones',
    purpose: 'Es el inbox unificado para registrar y enviar conversaciones vinculadas a propietarios, inquilinos, contactos y propiedades.',
    steps: [
      'Abrí una conversación existente o creá una nueva.',
      'Elegí destinatario, audiencia y canal: Portal, Email o WhatsApp.',
      'Escribí el mensaje y envialo desde el hilo.',
      'Usá el historial para mantener trazabilidad de la conversación.',
    ],
    impact: ['Los mensajes internos aparecen en el portal correspondiente.', 'Email y WhatsApp requieren que el destinatario tenga el dato de contacto y la integración configurada.'],
  },
  {
    path: '/notificaciones',
    title: 'Notificaciones',
    purpose: 'Muestra avisos generados por eventos importantes del sistema, como vencimientos, pagos, aumentos y mantenimiento.',
    steps: [
      'Revisá las notificaciones pendientes.',
      'Abrí el módulo relacionado para resolver el evento.',
      'Usá los filtros para separar avisos por tipo o estado cuando estén disponibles.',
    ],
    impact: ['Las notificaciones informan; la operación real se modifica en el módulo de origen.'],
  },
  {
    path: '/integraciones',
    title: 'Integraciones',
    purpose: 'Conecta OnlyMob con sistemas externos mediante API, webhooks e importaciones/exportaciones.',
    steps: [
      'Creá credenciales API únicamente para sistemas autorizados y asigná los permisos necesarios.',
      'Configurá webhooks si otro sistema necesita recibir eventos de OnlyMob.',
      'Usá importación/exportación para intercambiar datos compatibles.',
      'Revisá entregas y errores antes de considerar una integración productiva.',
    ],
    impact: ['Una credencial API puede leer o escribir información según sus scopes.', 'Los webhooks notifican eventos; no reemplazan las reglas internas de OnlyMob.'],
    tips: ['El token API se muestra una sola vez: guardalo de forma segura.'],
  },
  {
    path: '/ajustes',
    title: 'Configuración',
    purpose: 'Define parámetros generales de la inmobiliaria y comportamientos automáticos del sistema.',
    steps: [
      'Revisá los datos generales y parámetros disponibles.',
      'Activá solamente automatizaciones que quieras aplicar de forma real.',
      'En aumentos automáticos, recordá que también debe estar habilitado el contrato individual.',
      'Guardá los cambios y verificá su efecto en el módulo relacionado.',
    ],
    impact: ['Los cambios de configuración pueden afectar el comportamiento futuro de distintos módulos.'],
    tips: ['Las opciones automáticas deben activarse de forma consciente; no modifican datos históricos.'],
  },
];

function getHelp(pathname: string, fallbackTitle: string): HelpDefinition {
  const found = HELP.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  if (found) return found;
  return {
    path: pathname,
    title: fallbackTitle,
    purpose: `Esta sección forma parte del espacio de trabajo de OnlyMob y concentra las operaciones relacionadas con ${fallbackTitle.toLowerCase()}.`,
    steps: [
      'Revisá la información principal de la pantalla antes de realizar cambios.',
      'Usá las acciones disponibles para crear, editar o consultar registros.',
      'Confirmá las operaciones que impacten datos antes de ejecutarlas.',
    ],
    tips: ['Si una acción está vinculada a otro módulo, OnlyMob mantiene la relación para conservar la trazabilidad.'],
  };
}

export function ModuleHelp({ title }: { title: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const help = useMemo(() => getHelp(pathname, title), [pathname, title]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-xs transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
        aria-label={`Ayuda de ${help.title}`}
        title="¿Para qué sirve este módulo?"
      >
        <HelpCircle className="h-[17px] w-[17px]" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label={`Ayuda de ${help.title}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-600">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Ayuda del módulo
                </div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{help.title}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar ayuda">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">¿Para qué sirve?</h3>
                </div>
                <p className="text-sm leading-6 text-slate-600">{help.purpose}</p>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">¿Cómo funciona?</h3>
                </div>
                <ol className="space-y-2.5">
                  {help.steps.map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-xl bg-slate-50 px-3.5 py-3 text-sm leading-5 text-slate-600">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-extrabold text-indigo-600 shadow-xs">{index + 1}</span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {help.impact?.length ? (
                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.1em] text-indigo-700">Qué impacta</h3>
                  <ul className="space-y-1.5 text-sm leading-5 text-slate-600">
                    {help.impact.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </section>
              ) : null}

              {help.tips?.length ? (
                <section className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <h3 className="mb-1 text-xs font-extrabold uppercase tracking-[0.1em] text-amber-800">Importante</h3>
                    {help.tips.map((tip) => <p key={tip} className="text-sm leading-5 text-amber-900/80">{tip}</p>)}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
