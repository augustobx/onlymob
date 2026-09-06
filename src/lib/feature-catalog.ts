export const SAAS_FEATURES = [
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Habilita métricas avanzadas y el módulo de Analytics para el equipo.',
    area: 'Panel administrativo',
  },
  {
    key: 'integrations',
    label: 'Integraciones',
    description: 'Habilita API, webhooks e importación/exportación para sistemas externos.',
    area: 'Panel administrativo',
  },
  {
    key: 'owner_portal',
    label: 'Portal de propietarios',
    description: 'Permite a propietarios habilitados ingresar a su portal y consultar su cartera.',
    area: 'Portal externo',
  },
  {
    key: 'renter_portal',
    label: 'Portal de inquilinos',
    description: 'Permite a inquilinos habilitados usar la PWA para contratos, cuenta, recibos y reclamos.',
    area: 'PWA / Portal externo',
  },
  {
    key: 'automation',
    label: 'Automatizaciones',
    description: 'Habilita los procesos automáticos del tenant. Cada automatización conserva además sus propias reglas de seguridad.',
    area: 'Sistema',
  },
] as const;

export type SaasFeatureKey = (typeof SAAS_FEATURES)[number]['key'];

export const SAAS_FEATURE_KEYS = SAAS_FEATURES.map((feature) => feature.key) as SaasFeatureKey[];

export function isSaasFeatureKey(value: string): value is SaasFeatureKey {
  return SAAS_FEATURE_KEYS.includes(value as SaasFeatureKey);
}

export function featureEnabledFromMap(
  features: Record<string, boolean | undefined> | null | undefined,
  featureKey: SaasFeatureKey,
  defaultValue = true,
) {
  const value = features?.[featureKey];
  return typeof value === 'boolean' ? value : defaultValue;
}
