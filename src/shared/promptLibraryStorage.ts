import {
  approximateStorageSizeBytes,
  addPromptPair,
  deletePromptPair,
  type PromptPair,
} from './promptLibraryModel';
import { storageGet, storageSet } from './chromeStorage';

const STORAGE_KEY = 'prompt_library_v1';
const MAX_ITEMS = 200;

export type PromptLibraryMeta = {
  count: number;
  approxStorageSizeBytes: number;
};

export async function getPromptLibrary(): Promise<PromptPair[]> {
  const items = await storageGet<unknown>(STORAGE_KEY);
  if (!Array.isArray(items)) return [];
  return items as PromptPair[];
}

export async function addPromptPairToLibrary(next: PromptPair): Promise<PromptPair[]> {
  const items = await getPromptLibrary();
  const updated = addPromptPair(items, next, MAX_ITEMS);
  await storageSet({ [STORAGE_KEY]: updated });
  return updated;
}

export async function deletePromptPairFromLibrary(prompt_id: string): Promise<PromptPair[]> {
  const items = await getPromptLibrary();
  const updated = deletePromptPair(items, prompt_id);
  await storageSet({ [STORAGE_KEY]: updated });
  return updated;
}

export async function getPromptLibraryMeta(): Promise<PromptLibraryMeta> {
  const items = await getPromptLibrary();
  return {
    count: items.length,
    approxStorageSizeBytes: approximateStorageSizeBytes(items),
  };
}

