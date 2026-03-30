export const CLIENT_VERSION = '0.1.0';
export const CLIENT_TS_UNIT: 'seconds' = 'seconds';

export type ImproveRequest = {
  text: string;
  installation_id: string;
  client: 'extension';
  client_version: string;
  client_ts: number; // unix seconds
};

export type ImproveRateLimit = {
  per_minute_remaining: number;
  per_day_remaining: number;
  per_minute_total: number;
  per_day_total: number;
};

export type ImproveResponse = {
  request_id: string; // uuid
  improved_text: string;
  rate_limit: ImproveRateLimit;
};

export type LimitsResponse = ImproveRateLimit;

export type SavePromptRequest = {
  installation_id: string;
  client: 'extension';
  client_version: string;
  original_text: string;
  improved_text: string;
  meta: {
    source: 'popup';
  };
};

export type SavePromptResponse = {
  prompt_id: string; // uuid
};

