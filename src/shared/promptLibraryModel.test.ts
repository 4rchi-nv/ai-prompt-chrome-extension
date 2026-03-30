import { describe, expect, test } from 'vitest';
import {
  addPromptPair,
  approximateStorageSizeBytes,
  deletePromptPair,
  formatBytesKb,
  searchPromptPairs,
  type PromptPair,
} from './promptLibraryModel';

describe('promptLibraryModel', () => {
  test('addPromptPair prepends next and enforces max length', () => {
    const items: PromptPair[] = Array.from({ length: 3 }).map((_, i) => ({
      prompt_id: `id${i}`,
      original_text: `o${i}`,
      improved_text: `i${i}`,
      created_at: i,
    }));
    const next: PromptPair = {
      prompt_id: 'new',
      original_text: 'orig',
      improved_text: 'improved',
      created_at: 100,
    };

    const updated = addPromptPair(items, next, 3);
    expect(updated).toHaveLength(3);
    expect(updated[0].prompt_id).toBe('new');
  });

  test('searchPromptPairs matches original or improved (case-insensitive)', () => {
    const items: PromptPair[] = [
      { prompt_id: '1', original_text: 'Hello World', improved_text: 'Foo bar', created_at: 1 },
      { prompt_id: '2', original_text: 'Another', improved_text: 'Deep SEEk', created_at: 2 },
    ];

    expect(searchPromptPairs(items, 'hello')).toHaveLength(1);
    expect(searchPromptPairs(items, 'seek')).toHaveLength(1);
    expect(searchPromptPairs(items, '')).toHaveLength(2);
  });

  test('deletePromptPair removes by id', () => {
    const items: PromptPair[] = [
      { prompt_id: '1', original_text: 'a', improved_text: 'b', created_at: 1 },
      { prompt_id: '2', original_text: 'c', improved_text: 'd', created_at: 2 },
    ];
    const updated = deletePromptPair(items, '1');
    expect(updated).toHaveLength(1);
    expect(updated[0].prompt_id).toBe('2');
  });

  test('formatBytesKb renders B and KB', () => {
    expect(formatBytesKb(100)).toBe('100 B');
    expect(formatBytesKb(2048)).toBe('2.0 KB');
  });

  test('approximateStorageSizeBytes returns a positive number', () => {
    const items: PromptPair[] = [{ prompt_id: '1', original_text: 'a', improved_text: 'b', created_at: 1 }];
    expect(approximateStorageSizeBytes(items)).toBeGreaterThan(0);
  });
});

