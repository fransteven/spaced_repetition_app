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

import { saveReadingProgressAction } from '@/app/actions/reader-actions';
import { getOfflineDb } from './db';
import { pending } from './outbox';
import {
  isNetworkError,
  saveProgressOrQueue,
  submitReviewOnlineOrQueue,
  withOfflineFallback,
  type ReviewInput,
} from './persistence';
import { resetSyncStateForTests } from './sync';
import { clearOfflineDb, jsonResponse } from './test-utils';

const BOOK = '00000000-0000-4000-8000-00000000000a';
const fetchMock = vi.fn<typeof fetch>();

beforeEach(async () => {
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  vi.mocked(saveReadingProgressAction).mockReset();
  resetSyncStateForTests();
  await clearOfflineDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isNetworkError', () => {
  it('recognises fetch failures of each engine but not aborts or other errors', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true);
    expect(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true);
    expect(isNetworkError(new DOMException('aborted', 'AbortError'))).toBe(false);
    expect(isNetworkError(new Error('Something else'))).toBe(false);
  });
});

describe('withOfflineFallback', () => {
  it('returns envelope errors without queueing', async () => {
    const result = await withOfflineFallback(
      async () => ({ data: null, error: { code: 'FORBIDDEN', message: 'no' } }),
      { kind: 'preferences', payload: { theme: 'dark' } }
    );
    expect(result).toEqual({ ok: true, value: { data: null, error: { code: 'FORBIDDEN', message: 'no' } } });
    expect(await pending()).toHaveLength(0);
  });

  it('queues on a network failure', async () => {
    vi.mocked(saveReadingProgressAction).mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await saveProgressOrQueue({ book_id: BOOK, cfi: 'cfi', progress: 0.5 });
    expect(result).toEqual({ ok: false, queued: true });
    const items = await pending();
    expect(items[0]).toMatchObject({ kind: 'progress', payload: { book_id: BOOK, cfi: 'cfi', progress: 0.5 } });
  });

  it('rethrows errors that are not network failures', async () => {
    await expect(
      withOfflineFallback(async () => {
        throw new Error('bug');
      }, { kind: 'preferences', payload: {} })
    ).rejects.toThrow('bug');
  });
});

describe('submitReviewOnlineOrQueue', () => {
  const input: ReviewInput = {
    client_review_id: '22222222-2222-4222-8222-222222222222',
    card_id: 'c1',
    rating: 'good',
    reviewed_at: '2026-01-02T10:00:00.000Z',
  };

  it('queues offline and applies FSRS to the downloaded card', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const db = await getOfflineDb();
    await db.put('cards', {
      card_id: 'c1',
      deck_id: 'd1',
      front: 'f',
      back: 'b',
      image_url_1: null,
      image_url_2: null,
      source: null,
      schedule: {
        stability: 0,
        difficulty: 5,
        state: 'new',
        reps: 0,
        lapses: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        due_date: '2026-01-01T00:00:00.000Z',
        last_review: null,
      },
      updated_locally_at: null,
    });

    const result = await submitReviewOnlineOrQueue(input);
    expect(result.ok).toBe(false);
    if (result.ok || !result.queued) throw new Error('expected queued');
    expect(result.schedule).toMatchObject({ state: 'review', reps: 1, last_review: input.reviewed_at });
    expect(fetchMock).not.toHaveBeenCalled();

    const items = await pending();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'review', payload: input, created_at: input.reviewed_at });
    expect((await db.get('cards', 'c1'))?.updated_locally_at).not.toBeNull();
  });

  it('posts online with client_review_id and does not queue', async () => {
    const schedule = {
      stability: 3,
      difficulty: 5,
      state: 'review',
      reps: 1,
      lapses: 0,
      elapsed_days: 0,
      scheduled_days: 3,
      due_date: '2026-01-05T10:00:00.000Z',
      last_review: '2026-01-02T10:00:00.000Z',
    };
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { scheduled_days: 3, due_date: schedule.due_date, schedule }, error: null })
    );
    const result = await submitReviewOnlineOrQueue(input);
    expect(result).toMatchObject({ ok: true, value: { scheduled_days: 3 } });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      card_id: 'c1',
      rating: 'good',
      client_review_id: input.client_review_id,
    });
    expect(await pending()).toHaveLength(0);
  });

  it('returns 4xx errors without queueing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null, error: { code: 'NOT_FOUND', message: 'gone' } }, 404));
    const result = await submitReviewOnlineOrQueue(input);
    expect(result).toEqual({ ok: false, queued: false, status: 404, error: { code: 'NOT_FOUND', message: 'gone' } });
    expect(await pending()).toHaveLength(0);
  });
});
