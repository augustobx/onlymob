export type AccessSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED' | string;

function validDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function subscriptionStatusAllowsAccess(
  status: AccessSubscriptionStatus | null | undefined,
  trialEndsAt?: Date | string | null,
  currentPeriodEnd?: Date | string | null,
  now = new Date(),
) {
  if (!status) return true;
  if (status === 'SUSPENDED' || status === 'CANCELED') return false;

  if (status === 'TRIAL') {
    const trialEnd = validDate(trialEndsAt) || validDate(currentPeriodEnd);
    return !trialEnd || trialEnd.getTime() >= now.getTime();
  }

  const periodEnd = validDate(currentPeriodEnd);
  if (periodEnd && periodEnd.getTime() < now.getTime()) return false;
  return true;
}
