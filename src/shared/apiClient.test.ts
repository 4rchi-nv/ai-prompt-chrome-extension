import { describe, expect, test, vi } from 'vitest';
import { buildImproveRequest, getClientTsUnit, mapApiError } from './apiClient';
import { AuthInvalidError, RateLimitExceededError, ValidationError, InvalidInstallationError } from './apiClient';

describe('apiClient', () => {
  test('buildImproveRequest uses unix seconds and correct fields', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1710000000000); // => 1710000000 seconds
    const req = buildImproveRequest('hello', 'inst-1');
    expect(req.text).toBe('hello');
    expect(req.installation_id).toBe('inst-1');
    expect(req.client).toBe('extension');
    expect(req.client_ts).toBe(1710000000);
  });

  test('getClientTsUnit returns "seconds"', () => {
    expect(getClientTsUnit()).toBe('seconds');
  });

  test('mapApiError returns typed errors', () => {
    expect(mapApiError(429, 'Rate limit exceeded')).toBeInstanceOf(RateLimitExceededError);
    expect(mapApiError(403, 'Your login is invalid')).toBeInstanceOf(AuthInvalidError);
    expect(mapApiError(422, 'Validation error')).toBeInstanceOf(ValidationError);
    expect(mapApiError(404, 'Invalid installation')).toBeInstanceOf(InvalidInstallationError);
  });
});

