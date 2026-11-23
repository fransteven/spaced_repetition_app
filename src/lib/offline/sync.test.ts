import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/actions/reader-actions', () => ({
  saveReadingProgressAction: vi.fn(),
  saveBookLocationsAction: vi.fn(),
  createAnnotationAction: vi.fn(),
  updateAnnotationAction: vi.fn(),
  deleteAnnotationAction: vi.fn(),
  createBookmarkAction: vi.fn(),
  deleteBookmarkAction: vi.fn(),
  updateReaderPreferencesAction: vi.fn(),
}));

import {
  createBookmarkAction,
  deleteAnnotationAction,
  saveBookLocationsAction,
  saveReadingProgressAction,
  updateReaderPreferencesAction,
} from '@/app/actions/reader-actions';
import { getOfflineDb } from './db';
import { count, enqueue, pending } from './outbox';
import { flush, resetSyncStateForTests } from './sync';
import { clearOfflineDb, jsonResponse } from './test-utils';
import type { ScheduleWire } from './types';

const BOOK = '00000000-0000-4000-8000-00000000000a';
const DECK = '00000000-0000-4000-8000-0000000000dd';

const baseSchedule: ScheduleWire = {
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

function review(id: string, cardId = 'c1'): Parameters<typeof enqueue>[0] {
  return {
    kind: 'review',
    payload: { client_review_id: id, card_id: cardId, rating: 'good', reviewed_at: '2026-01-02T10:00:00.000Z' },
  };
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(async () => {
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  vi.mocked(saveReadingProgressAction).mockReset();
  vi.mocked(deleteAnnotationAction).mockReset();
  vi.mocked(createBookmarkAction).mockReset();
  vi.mocked(updateReaderPreferencesAction).mockReset();
  resetSyncStateForTests();
  await clearOfflineDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('flush — reviews', () => {
  it('drops applied/duplicate/stale/not_found items and applies returned schedules', async () => {
    const db = await getOfflineDb();
    await db.put('cards', {
      card_id: 'c1',
      deck_id: DECK,
      front: 'f',
      back: 'b',
      image_url_1: null,
      image_url_2: null,
      source: null,
      schedule: baseSchedule,
      updated_locally_at: '2026-01-02T10:00:00.000Z',
    });
    for (const id of ['r1', 'r2', 'r3', 'r4']) await enqueue(review(id));

    const serverSchedule: ScheduleWire = {
      ...baseSchedule,
      stability: 3.1,
      state: 'review',
      reps: 1,
      scheduled_days: 3,
      due_date: '2026-01-05T10:00:00.000Z',
      last_review: '2026-01-02T10:00:00.000Z',
    };
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          results: [
            { client_review_id: 'r1', status: 'applied' },
            { client_review_id: 'r2', status: 'duplicate' },
            { client_review_id: 'r3', status: 'stale' },
            { client_review_id: 'r4', status: 'not_found' },
          ],
          schedules: [{ card_id: 'c1', ...serverSchedule }],
        },
        error: null,
      })
    );

    const result = await flush();
    expect(result).toMatchObject({ sent: 2, stale: 1, dropped: 1, failed: 0, skipped: false });
    expect(await pending()).toHaveLength(0);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/study/review/sync');
    expect(JSON.parse(String(init?.body))).toEqual({
      reviews: ['r1', 'r2', 'r3', 'r4'].map((id) => ({
        client_review_id: id,
        card_id: 'c1',
        rating: 'good',
        reviewed_at: '2026-01-02T10:00:00.000Z',
      })),
    });

    const card = await db.get('cards', 'c1');
    expect(card?.schedule).toEqual(serverSchedule);
    expect(card?.updated_locally_at).toBeNull();
  });

  it('stops on a network error, keeps the items and backs off', async () => {
    await enqueue(review('r1'));
    await enqueue({ kind: 'preferences', payload: { theme: 'dark' } });
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await flush();
    expect(result).toMatchObject({ sent: 0, failed: 1, skipped: false });
    expect(updateReaderPreferencesAction).not.toHaveBeenCalled();
    const items = await pending();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: 'review', attempts: 1, last_error: 'Failed to fetch' });

    // Backoff: a normal flush is skipped, a forced one ("Sync now") runs.
    expect((await flush()).skipped).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { results: [{ client_review_id: 'r1', status: 'applied' }], schedules: [] }, error: null })
    );
    vi.mocked(updateReaderPreferencesAction).mockResolvedValueOnce({ data: null, error: null });
    const retry = await flush({ force: true });
    expect(retry).toMatchObject({ sent: 2, failed: 0 });
    expect(await pending()).toHaveLength(0);
  });

  it('retries a rejected batch one by one so only invalid reviews drop', async () => {
    await enqueue(review('r1'));
    await enqueue(review('bad'));
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: null, error: { code: 'VALIDATION_ERROR', message: 'bad' } }, 400))
      .mockResolvedValueOnce(
        jsonResponse({ data: { results: [{ client_review_id: 'r1', status: 'applied' }], schedules: [] }, error: null })
      )
      .mockResolvedValueOnce(jsonResponse({ data: null, error: { code: 'VALIDATION_ERROR', message: 'bad' } }, 400));

    const result = await flush();
    expect(result).toMatchObject({ sent: 1, dropped: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(await pending()).toHaveLength(0);
  });

  it('keeps the batch on a server error', async () => {
    await enqueue(review('r1'));
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null, error: { code: 'INTERNAL_ERROR', message: 'x' } }, 500));
    const result = await flush();
    expect(result).toMatchObject({ failed: 1, dropped: 0 });
    expect(await pending()).toHaveLength(1);
  });
});

describe('flush — reader actions', () => {
  it('treats NOT_FOUND on a delete as success and sends progress with client_updated_at', async () => {
    await enqueue({ kind: 'annotation.delete', payload: { id: 'a1', book_id: BOOK } });
    const progress = await enqueue({ kind: 'progress', payload: { book_id: BOOK, cfi: 'cfi', progress: 0.4 } });
    vi.mocked(deleteAnnotationAction).mockResolvedValueOnce({
      data: null,
      error: { code: 'NOT_FOUND', message: 'gone' },
    });
    vi.mocked(saveReadingProgressAction).mockResolvedValueOnce({ data: null, error: null });

    const result = await flush();
    expect(result).toMatchObject({ sent: 2, dropped: 0, failed: 0 });
    expect(deleteAnnotationAction).toHaveBeenCalledWith('a1');
    expect(saveReadingProgressAction).toHaveBeenCalledWith({
      book_id: BOOK,
      cfi: 'cfi',
      progress: 0.4,
      client_updated_at: progress?.created_at,
    });
    expect(await pending()).toHaveLength(0);
  });

  it('drops VALIDATION_ERROR / FORBIDDEN items and continues', async () => {
    await enqueue({ kind: 'progress', payload: { book_id: BOOK, cfi: 'cfi', progress: 2 } });
    await enqueue({ kind: 'preferences', payload: { theme: 'dark' } });
    vi.mocked(saveReadingProgressAction).mockResolvedValueOnce({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'progress' },
    });
    vi.mocked(updateReaderPreferencesAction).mockResolvedValueOnce({
      data: null,
      error: { code: 'FORBIDDEN', message: 'no' },
    });

    const result = await flush();
    expect(result).toMatchObject({ sent: 0, dropped: 2, failed: 0 });
    expect(await pending()).toHaveLength(0);
  });

  it('stops FIFO on a server error or a thrown network error', async () => {
    await enqueue({ kind: 'progress', payload: { book_id: BOOK, cfi: 'cfi', progress: 0.1 } });
    await enqueue({ kind: 'preferences', payload: { theme: 'dark' } });
    vi.mocked(saveReadingProgressAction).mockRejectedValueOnce(new TypeError('Load failed'));

    const result = await flush();
    expect(result).toMatchObject({ sent: 0, failed: 1 });
    expect(updateReaderPreferencesAction).not.toHaveBeenCalled();
    const items = await pending();
    expect(items.map((i) => [i.kind, i.attempts])).toEqual([
      ['progress', 1],
      ['preferences', 0],
    ]);
  });

  it('maps an offline bookmark to its server id', async () => {
    await enqueue({
      kind: 'bookmark.create',
      payload: { local_id: 'local-1', book_id: BOOK, cfi: 'epubcfi(/6/2)', progress: 0.3 },
    });
    vi.mocked(createBookmarkAction).mockResolvedValueOnce({
      data: {
        id: 'server-1',
        book_id: BOOK,
        user_id: 'u1',
        cfi: 'epubcfi(/6/2)',
        chapter_label: null,
        excerpt: null,
        progress: 0.3,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      },
      error: null,
    });

    const result = await flush();
    expect(createBookmarkAction).toHaveBeenCalledWith({
      book_id: BOOK,
      cfi: 'epubcfi(/6/2)',
      chapter_label: undefined,
      excerpt: undefined,
      progress: 0.3,
    });
    expect(result.bookmark_ids).toEqual([{ book_id: BOOK, local_id: 'local-1', id: 'server-1' }]);
  });

  it('never sends an item twice when flushes overlap', async () => {
    await enqueue({ kind: 'preferences', payload: { theme: 'dark' } });
    vi.mocked(updateReaderPreferencesAction).mockResolvedValue({ data: null, error: null });
    await Promise.all([flush(), flush(), flush()]);
    expect(updateReaderPreferencesAction).toHaveBeenCalledTimes(1);
  });

  it('sends an item enqueued during a run in a follow-up run', async () => {
    await enqueue({ kind: 'preferences', payload: { theme: 'dark' } });
    vi.mocked(updateReaderPreferencesAction).mockImplementationOnce(async () => {
      await enqueue({ kind: 'locations', payload: { book_id: BOOK, locations_json: '[]' } });
      return { data: null, error: null };
    });
    vi.mocked(saveBookLocationsAction).mockResolvedValue({ data: null, error: null });
    const first = flush();
    const second = flush(); // arrives while the first run is sending
    await Promise.all([first, second]);
    expect(saveBookLocationsAction).toHaveBeenCalledTimes(1);
    expect(await count()).toBe(0);
  });
});
