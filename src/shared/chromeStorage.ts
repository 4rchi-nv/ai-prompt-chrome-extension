export async function storageGet<T = unknown>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(err);
      resolve(result?.[key] as T | undefined);
    });
  });
}

export async function storageSet(entries: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(entries, () => {
      const err = chrome.runtime.lastError;
      if (err) return reject(err);
      resolve();
    });
  });
}

