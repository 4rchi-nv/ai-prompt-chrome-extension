import type { TabKey } from '../ui/tabTypes';
import { storageGet, storageSet } from './chromeStorage';

const STORAGE_KEY = 'pt_draft_v1';

export type UiDraft = {
  activeTab: TabKey;
  originalText: string;
  improvedText: string;
};

export async function loadUiDraft(): Promise<UiDraft | null> {
  const draft = (await storageGet<UiDraft>(STORAGE_KEY)) as UiDraft | undefined;
  if (!draft) return null;
  if (draft.activeTab !== 'improve' && draft.activeTab !== 'library') return null;
  return draft;
}

export async function saveUiDraft(draft: UiDraft): Promise<void> {
  await storageSet({ [STORAGE_KEY]: draft });
}

