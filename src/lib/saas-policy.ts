export type AccessSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED' | string;

export function subscriptionStatusAllowsAccess(
  status: AccessSubscriptionStatus | null | undefined,
  trialEndsAt?: Date | string | null,
  now = new Date(),
) {
  if (!status) return true;
  if (status === 'SUSPENDED' || status === 'CANCELED') return false;
  if (status === 'TRIAL' && trialEndsAt) {
    const end = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
    if (!Number.isNaN(end.getTime()) && end.getTime() < now.getTime()) return false;
  }
  return true;
}
