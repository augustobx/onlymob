const ADJUSTMENT_METHOD_LABELS: Record<string, string> = {
  FIXED_PERCENT: 'Porcentaje fijo',
  ICL: 'ICL / BCRA',
  IPC: 'IPC',
  MANUAL: 'Manual',
  OTHER: 'Otro',
};

export function adjustmentMethodLabel(method?: string | null) {
  if (!method) return 'Ajuste contractual';
  return ADJUSTMENT_METHOD_LABELS[method] || method
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

export function adjustmentDisplayLabel(index?: string | null, method?: string | null) {
  const cleanIndex = index?.trim();
  if (cleanIndex) return cleanIndex;
  return adjustmentMethodLabel(method);
}
