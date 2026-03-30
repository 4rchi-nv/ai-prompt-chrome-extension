export type RateBadgeState = 'normal' | 'warn' | 'danger';

export function getRateBadgeState(per_day_remaining: number, per_day_total: number): RateBadgeState {
  if (per_day_remaining <= 0) return 'danger';
  if (per_day_total <= 0) return 'danger';

  const warnThreshold = Math.max(1, Math.floor(per_day_total * 0.2)); // last 20% of daily quota
  return per_day_remaining <= warnThreshold ? 'warn' : 'normal';
}

export function formatRateBadge(per_day_remaining: number, per_day_total: number): string {
  return `${per_day_remaining}/${per_day_total} today`;
}

