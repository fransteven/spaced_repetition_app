import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOfflineDb } from './db';
import { InsufficientStorageError, checkOwner, ensureSpace, getUsage } from './storage';

function stubStorage(usage: number, quota: number): void {
  vi.stubGlobal('navigator', {
    storage: {
      estimate: vi.fn(async () => ({ usage, quota })),
      persisted: vi.fn(async () => false),
      persist: vi.fn(async () => true),
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ensureSpace', () => {
  it('passes when the download plus 10 % fits', async () => {
    stubStorage(0, 1_100);
    await expect(ensureSpace(1_000)).resolves.toBeUndefined();
  });

  it('throws InsufficientStorageError when it does not fit', async () => {
    stubStorage(500, 1_500);
    const error = await ensureSpace(1_000).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InsufficientStorageError);
    expect(error).toMatchObject({ needed: 1_100, available: 1_000 });
  });

  it('allows the download when the quota cannot be read', async () => {
    vi.stubGlobal('navigator', {});
    await expect(ensureSpace(10 ** 12)).resolves.toBeUndefined();
    expect(await getUsage()).toEqual({ supported: false, usage: 0, quota: 0, persisted: false });
  });
});

describe('checkOwner', () => {
  it('wipes data stored by another user', async () => {
    vi.stubGlobal('navigator', {});
    const db = await getOfflineDb();
    await db.put('decks', {
      id: 'd1',
      owner_id: 'user-a',
      name: 'Deck',
      downloaded_at: '2026-01-01T00:00:00.000Z',
      image_urls: [],
      image_count: 0,
      image_bytes: 0,
      card_count: 0,
      snapshot: { deck: { id: 'd1', name: 'Deck', description: null, subject: 'custom' }, server_time: '' },
    });

    expect(await checkOwner('user-a')).toBe(false);
    expect(await checkOwner('user-b')).toBe(true);
    const reopened = await getOfflineDb();
    expect(await reopened.count('decks')).toBe(0);
  });
});
