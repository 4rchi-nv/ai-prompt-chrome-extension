export type PromptPair = {
  prompt_id: string;
  original_text: string;
  improved_text: string;
  created_at: number; // unix ms
};

export function searchPromptPairs(items: PromptPair[], query: string): PromptPair[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => {
    const haystack = `${it.original_text}\n${it.improved_text}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function addPromptPair(
  items: PromptPair[],
  next: PromptPair,
  maxItems: number,
): PromptPair[] {
  const merged = [next, ...items];
  return merged.slice(0, maxItems);
}

export function deletePromptPair(items: PromptPair[], prompt_id: string): PromptPair[] {
  return items.filter((it) => it.prompt_id !== prompt_id);
}

export function approximateStorageSizeBytes(items: PromptPair[]): number {
  // Chrome provides no trivial exact "storage size" API. We approximate via JSON bytes.
  const json = JSON.stringify(items);
  return new TextEncoder().encode(json).byteLength;
}

export function formatBytesKb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

