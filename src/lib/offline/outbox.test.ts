import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { count, enqueue, markFailed, onOutboxChange, pending, remove } from './outbox';
import { clearOfflineDb } from './test-utils';

const BOOK_A = '00000000-0000-4000-8000-00000000000a';
const BOOK_B = '00000000-0000-4000-8000-00000000000b';

beforeEach(async () => {
  vi.stubGlobal('BroadcastChannel', undefined);
  await clearOfflineDb();
});

describe('outbox', () => {
  it('keeps items in FIFO order', async () => {
    await enqueue({ kind: 'annotation.delete', payload: { id: 'a1', book_id: BOOK_A } });
    await enqueue({ kind: 'review', payload: { client_review_id: 'r1', card_id: 'c1', rating: 'good', reviewed_at: '2026-01-01T00:00:00.000Z' } });
    await enqueue({ kind: 'bookmark.delete', payload: { id: 'b1', book_id: BOOK_A } });

    const items = await pending();
    expect(items.map((i) => i.kind)).toEqual(['annotation.delete', 'review', 'bookmark.delete']);
    expect(items.every((i) => i.attempts === 0 && typeof i.id === 'string')).toBe(true);
    expect(await count()).toBe(3);
  });

  it('keeps only the latest progress per book', async () => {
    await enqueue({ kind: 'progress', payload: { book_id: BOOK_A, cfi: 'cfi-1', progress: 0.1 } });
    await enqueue({ kind: 'progress', payload: { book_id: BOOK_B, cfi: 'cfi-b', progress: 0.5 } });
    await enqueue({ kind: 'progress', payload: { book_id: BOOK_A, cfi: 'cfi-2', progress: 0.2 } });

    const items = await pending();
    expect(items).toHaveLength(2);
    const progress = items.flatMap((i) => (i.kind === 'progress' ? [i.payload] : []));
    expect(progress).toEqual([
      { book_id: BOOK_B, cfi: 'cfi-b', progress: 0.5 },
      { book_id: BOOK_A, cfi: 'cfi-2', progress: 0.2 },
    ]);
  });

  it('keeps only the latest locations per book', async () => {
    await enqueue({ kind: 'locations', payload: { book_id: BOOK_A, locations_json: '[1]' } });
    await enqueue({ kind: 'locations', payload: { book_id: BOOK_A, locations_json: '[1,2]' } });
    const items = await pending();
    expect(items).toHaveLength(1);
    expect(items[0]?.kind === 'locations' && items[0].payload.locations_json).toBe('[1,2]');
  });

  it('merges pending preference patches into one item', async () => {
    await enqueue({ kind: 'preferences', payload: { theme: 'dark', font_scale: 1.2 } });
    await enqueue({ kind: 'preferences', payload: { font_scale: 1.4 } });
    const items = await pending();
    expect(items).toHaveLength(1);
    expect(items[0]?.kind === 'preferences' && items[0].payload).toEqual({ theme: 'dark', font_scale: 1.4 });
  });

  it('keeps a create and a later delete in order (never cancels a create the flush may be sending)', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    await enqueue({
      kind: 'annotation.create',
      payload: { id, book_id: BOOK_A, cfi_range: 'r', quote: 'q', color: 'yellow' },
    });
    await enqueue({ kind: 'bookmark.create', payload: { local_id: 'local-1', book_id: BOOK_A, cfi: 'epubcfi(/6/2)', progress: 0.3 } });
    await enqueue({ kind: 'bookmark.delete', payload: { id: 'local-1', book_id: BOOK_A } });
    await enqueue({ kind: 'annotation.delete', payload: { id, book_id: BOOK_A } });
    const items = await pending();
    expect(items.map((i) => i.kind)).toEqual(['annotation.create', 'bookmark.create', 'bookmark.delete', 'annotation.delete']);
  });

  it('removes by id and records failures', async () => {
    const a = await enqueue({ kind: 'annotation.delete', payload: { id: 'a1', book_id: BOOK_A } });
    const b = await enqueue({ kind: 'annotation.delete', payload: { id: 'a2', book_id: BOOK_A } });
    if (!a || !b) throw new Error('enqueue failed');

    await markFailed(b.id, new Error('boom'));
    await markFailed(b.id, new Error('boom again'));
    await remove([a.id]);

    const items = await pending();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: b.id, attempts: 2, last_error: 'boom again' });
  });

  it('notifies listeners on change', async () => {
    const listener = vi.fn();
    const stop = onOutboxChange(listener);
    await enqueue({ kind: 'annotation.delete', payload: { id: 'a1', book_id: BOOK_A } });
    stop();
    await enqueue({ kind: 'annotation.delete', payload: { id: 'a2', book_id: BOOK_A } });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
