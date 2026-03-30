import { storageGet, storageSet } from './chromeStorage';

const STORAGE_KEY = 'installation_id';

function uuidFallback(): string {
  // Best-effort fallback; in modern browsers `crypto.randomUUID` exists.
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `${toHex(bytes[0])}${toHex(bytes[1])}${toHex(bytes[2])}${toHex(bytes[3])}-${toHex(bytes[4])}${toHex(
    bytes[5],
  )}-${toHex(bytes[6])}${toHex(bytes[7])}-${toHex(bytes[8])}${toHex(bytes[9])}-${toHex(bytes[10])}${toHex(
    bytes[11],
  )}${toHex(bytes[12])}${toHex(bytes[13])}${toHex(bytes[14])}${toHex(bytes[15])}`;
}

async function getOrCreateInstallationId(): Promise<string> {
  const existing = await storageGet<string>(STORAGE_KEY);
  if (typeof existing === 'string' && existing.length > 0) return existing;

  const id = globalThis.crypto?.randomUUID?.() ?? uuidFallback();
  await storageSet({ [STORAGE_KEY]: id });
  return id;
}

export async function getInstallationId(): Promise<string> {
  return getOrCreateInstallationId();
}

