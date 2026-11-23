import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteDeck, downloadDeck, getDeckCards, listDecks, updateLocalSchedule } from './deck-download';
import { IMAGE_CACHE_NAME } from './storage';
import { clearOfflineDb, jsonResponse } from './test-utils';
import type { OfflineDeckSnapshotWire, ScheduleWire } from './types';

class FakeCache {
  readonly entries = new Map<string, Response>();
  async match(url: string): Promise<Response | undefined> {
    return this.entries.get(url)?.clone();
  }
  async put(url: string, response: Response): Promise<void> {
    this.entries.set(url, response);
  }
  async delete(url: string): Promise<boolean> {
    return this.entries.delete(url);
  }
}

const cache = new FakeCache();
const fakeCaches = {
  open: vi.fn(async (name: string) => {
    if (name !== IMAGE_CACHE_NAME) throw new Error(`unexpected cache ${name}`);
    return cache;
  }),
  delete: vi.fn(async () => true),
};

const schedule: ScheduleWire = {
  stability: 0,
  difficulty: 5,
  state: 'new',
  reps: 0,
  lapses: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  due_date: '2026-01-01T00:00:00.000Z',
  last_review: null,
};

const IMG = (n: number): string => `https://res.cloudinary.com/demo/image/upload/${n}.png`;

function snapshot(deckId: string, cards: Array<[string, string | null, string | null]>): OfflineDeckSnapshotWire {
  return {
    deck: { id: deckId, name: `Deck ${deckId}`, description: null, subject: 'custom' },
    cards: cards.map(([card_id, image_url_1, image_url_2]) => ({
      card_id,
      front: 'q',
      back: 'a',
      image_url_1,
      image_url_2,
      source: null,
      schedule,
    })),
    server_time: '2026-01-01T00:00:00.000Z',
  };
}

const snapshots = new Map<string, OfflineDeckSnapshotWire>();
const fetchMock = vi.fn<typeof fetch>(async (input) => {
  const url = String(input);
  const match = /^\/api\/offline\/decks\/(.+)$/.exec(url);
  if (match) {
    const snap = snapshots.get(decodeURIComponent(match[1] ?? ''));
    return snap ? jsonResponse({ data: snap, error: null }) : jsonResponse({ data: null, error: { code: 'NOT_FOUND', message: 'x' } }, 404);
  }
  if (url === IMG(404)) return new Response('missing', { status: 404 });
  return new Response(new Blob(['x'.repeat(10)]), { status: 200 });
});

beforeEach(async () => {
  vi.stubGlobal('caches', fakeCaches);
  vi.stubGlobal('fetch', fetchMock);
  cache.entries.clear();
  snapshots.clear();
  fetchMock.mockClear();
  await clearOfflineDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('downloadDeck / deleteDeck', () => {
  it('stores cards and caches unique images, skipping failures', async () => {
    snapshots.set('A', snapshot('A', [['a1', IMG(1), IMG(2)], ['a2', IMG(2), null], ['a3', IMG(404), null]]));
    const progress = vi.fn();
    const deck = await downloadDeck('A', 'owner', { onProgress: progress });

    expect(deck).toMatchObject({ id: 'A', owner_id: 'owner', card_count: 3, image_count: 2, image_bytes: 20 });
    expect(deck.image_urls.sort()).toEqual([IMG(1), IMG(2), IMG(404)].sort());
    expect([...cache.entries.keys()].sort()).toEqual([IMG(1), IMG(2)].sort());
    expect((await getDeckCards('A')).map((c) => c.card_id).sort()).toEqual(['a1', 'a2', 'a3']);
    expect(progress).toHaveBeenLastCalledWith({ phase: 'done', loaded: 3, total: 3 });

    const imageFetch = fetchMock.mock.calls.find(([url]) => String(url) === IMG(1));
    expect(imageFetch?.[1]).toMatchObject({ mode: 'cors' });
  });

  it('only drops images no other downloaded deck uses', async () => {
    snapshots.set('A', snapshot('A', [['a1', IMG(1), IMG(2)]]));
    snapshots.set('B', snapshot('B', [['b1', IMG(2), IMG(3)]]));
    await downloadDeck('A', 'owner');
    await downloadDeck('B', 'owner');
    expect(cache.entries.size).toBe(3);

    await deleteDeck('A');
    expect([...cache.entries.keys()].sort()).toEqual([IMG(2), IMG(3)].sort());
    expect(await getDeckCards('A')).toEqual([]);
    expect((await listDecks()).map((d) => d.id)).toEqual(['B']);

    await deleteDeck('B');
    expect(cache.entries.size).toBe(0);
  });

  it('keeps a local schedule newer than the server copy on re-download', async () => {
    snapshots.set('A', snapshot('A', [['a1', null, null], ['a2', null, null]]));
    await downloadDeck('A', 'owner');
    const local: ScheduleWire = { ...schedule, state: 'review', reps: 1, last_review: '2026-01-03T00:00:00.000Z' };
    await updateLocalSchedule('a1', local);

    snapshots.set('A', snapshot('A', [['a1', null, null]]));
    await downloadDeck('A', 'owner');
    const cards = await getDeckCards('A');
    expect(cards).toHaveLength(1);
    expect(cards[0]?.schedule).toEqual(local);
  });
});
