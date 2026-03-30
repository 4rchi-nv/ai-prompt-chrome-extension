import {
  CLIENT_TS_UNIT,
  CLIENT_VERSION,
  type ImproveRequest,
  type ImproveResponse,
  type LimitsResponse,
  type SavePromptRequest,
  type SavePromptResponse,
} from './apiContract';

export type ApiBaseUrl = string;

export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export class RateLimitExceededError extends ApiError {}
export class AuthInvalidError extends ApiError {}
export class ValidationError extends ApiError {}
export class InvalidInstallationError extends ApiError {}
export class NetworkError extends ApiError {}

function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function buildImproveRequest(text: string, installation_id: string): ImproveRequest {
  return {
    text,
    installation_id,
    client: 'extension',
    client_version: CLIENT_VERSION,
    client_ts: nowUnixSeconds(),
  };
}

export function buildSavePromptRequest(
  installation_id: string,
  original_text: string,
  improved_text: string,
): SavePromptRequest {
  return {
    installation_id,
    client: 'extension',
    client_version: CLIENT_VERSION,
    original_text,
    improved_text,
    meta: {
      source: 'popup',
    },
  };
}

async function parseErrorText(res: Response): Promise<string> {
  try {
    return (await res.text()) || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export function mapApiError(status: number, message: string): ApiError {
  if (status === 429) return new RateLimitExceededError(message, status);
  if (status === 403) return new AuthInvalidError(message, status);
  if (status === 422) return new ValidationError(message, status);
  // Some backends use 404 for invalid installation, but contract isn't explicit.
  if (status === 404) return new InvalidInstallationError(message, status);
  return new ApiError(message, status);
}

export async function fetchLimits(baseUrl: ApiBaseUrl, installation_id: string): Promise<LimitsResponse> {
  const url = new URL('/v1/limits', baseUrl);
  url.searchParams.set('installation_id', installation_id);
  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    throw mapApiError(res.status, await parseErrorText(res));
  }
  return (await res.json()) as LimitsResponse;
}

export async function improvePrompt(
  baseUrl: ApiBaseUrl,
  installation_id: string,
  text: string,
): Promise<ImproveResponse> {
  const url = new URL('/v1/improve', baseUrl);
  const body = buildImproveRequest(text, installation_id);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body satisfies ImproveRequest),
  });
  if (!res.ok) {
    throw mapApiError(res.status, await parseErrorText(res));
  }
  return (await res.json()) as ImproveResponse;
}

export async function savePromptToBackend(
  baseUrl: ApiBaseUrl,
  installation_id: string,
  original_text: string,
  improved_text: string,
): Promise<SavePromptResponse> {
  const url = new URL('/v1/prompts', baseUrl);
  const body = buildSavePromptRequest(installation_id, original_text, improved_text);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body satisfies SavePromptRequest),
  });
  if (!res.ok) {
    throw mapApiError(res.status, await parseErrorText(res));
  }
  return (await res.json()) as SavePromptResponse;
}

export function getClientTsUnit(): string {
  return CLIENT_TS_UNIT;
}

