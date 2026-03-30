import { describe, expect, test } from 'vitest';
import { formatRateBadge, getRateBadgeState } from './rateLimit';

describe('rateLimit', () => {
  test('formatRateBadge prints remaining/total today', () => {
    expect(formatRateBadge(47, 50)).toBe('47/50 today');
  });

  test('getRateBadgeState => danger when exhausted', () => {
    expect(getRateBadgeState(0, 50)).toBe('danger');
    expect(getRateBadgeState(-1, 50)).toBe('danger');
  });

  test('getRateBadgeState => warn inside last 20% of daily quota', () => {
    // total=50 => warnThreshold = floor(50*0.2)=10
    expect(getRateBadgeState(10, 50)).toBe('warn');
    expect(getRateBadgeState(9, 50)).toBe('warn');
  });

  test('getRateBadgeState => normal when above warning threshold', () => {
    expect(getRateBadgeState(11, 50)).toBe('normal');
  });
});

