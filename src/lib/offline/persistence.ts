// Online-first mutations with an offline fallback (browser only). Each helper tries the Server
// Action / fetch; only a network failure (or being offline) queues the change in the outbox.
// Server Actions report errors in their `{ data, error }` envelope: those are returned, not queued.
// Every helper also mirrors the change into the downloaded copy (book snapshot / card schedule),
// so the offline shells show it. Used online too, so a flaky mobile connection loses nothing.
import {
  createAnnotationAction,
  createBookmarkAction,
  deleteAnnotationAction,
  deleteBookmarkAction,
  saveBookLocationsAction,
  saveReadingProgressAction,
  updateAnnotationAction,
  updateReaderPreferencesAction,
} from '@/app/actions/reader-actions';
import { review } from '@/lib/fsrs/algorithm';
import { getOfflineBook, updateAllBookSnapshots, updateBookSnapshot } from './book-files';
import { getLocalCard, updateLocalSchedule } from './deck-download';
import { isIndexedDbAvailable } from './db';
import { readEnvelope } from './fetch-json';
import { isBrowserOffline, isNetworkError } from './network';
import {
  enqueue,
  pending,
  type AnnotationCreatePayload,
  type AnnotationUpdatePayload,
  type BookmarkCreatePayload,
  type LocationsPayload,
  type OutboxItemInput,
  type PreferencesPayload,
  type ProgressPayload,
  type ReviewPayload,
} from './outbox';
import { annotationToWire, bookmarkToWire } from './reader-snapshot';
import { scheduleFromWire, scheduleToWire } from './schedule-wire';
import { flush } from './sync';
import type { BookAnnotationWire, OfflineBookSnapshotWire, ScheduleWire, SubmitReviewResponseWire } from './types';

export { isNetworkError } from './network';

export type OfflineFallbackResult<T> = { ok: true; value: T } | { ok: false; queued: true };

type ActionResultOf<F extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<F>>;

function kickFlush(): void {
  flush().catch((error: unknown) => console.warn('[offline] flush failed', error));
}

async function hasPendingReaderItems(): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false;
  try {
    return (await pending()).some((item) => item.kind !== 'review');
  } catch {
    return false;
  }
}

/**
 * Runs `call`; when offline or it fails on the network, enqueues `enqueueItem` instead.
 * Other errors are rethrown. Reader changes also queue while older reader changes are still
 * pending, so the server always receives them in order (e.g. update after an offline create).
 */
export async function withOfflineFallback<T>(
  call: () => Promise<T>,
  enqueueItem: OutboxItemInput
): Promise<OfflineFallbackResult<T>> {
  const mustQueue =
    isBrowserOffline() || (enqueueItem.kind !== 'review' && (await hasPendingReaderItems()));
  if (!mustQueue) {
    try {
      return { ok: true, value: await call() };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }
  await enqueue(enqueueItem);
  kickFlush();
  return { ok: false, queued: true };
}

/** Best-effort mirror into the downloaded book (no-op when it is not downloaded). */
async function mirrorBook(
  bookId: string,
  update: (snapshot: OfflineBookSnapshotWire) => OfflineBookSnapshotWire
): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    await updateBookSnapshot(bookId, update);
  } catch (error) {
    console.warn('[offline] could not update the downloaded book', bookId, error);
  }
}

/** Queued, or the server accepted it. */
function succeeded(result: OfflineFallbackResult<{ error: unknown }>): boolean {
  return !result.ok || result.value.error === null;
}

// ── reader ───────────────────────────────────────────────────────────────────

export async function saveProgressOrQueue(
  input: ProgressPayload
): Promise<OfflineFallbackResult<ActionResultOf<typeof saveReadingProgressAction>>> {
  const clientUpdatedAt = new Date().toISOString();
  const result = await withOfflineFallback(
    () => saveReadingProgressAction({ ...input, client_updated_at: clientUpdatedAt }),
    { kind: 'progress', payload: input }
  );
  if (succeeded(result)) {
    await mirrorBook(input.book_id, (s) => ({ ...s, book: { ...s.book, last_cfi: input.cfi, progress: input.progress } }));
  }
  return result;
}

export async function saveLocationsOrQueue(
  input: LocationsPayload
): Promise<OfflineFallbackResult<ActionResultOf<typeof saveBookLocationsAction>>> {
  const result = await withOfflineFallback(() => saveBookLocationsAction(input), { kind: 'locations', payload: input });
  if (succeeded(result)) {
    await mirrorBook(input.book_id, (s) => ({ ...s, book: { ...s.book, locations_json: input.locations_json } }));
  }
  return result;
}

export async function savePreferencesOrQueue(
  input: PreferencesPayload
): Promise<OfflineFallbackResult<ActionResultOf<typeof updateReaderPreferencesAction>>> {
  const result = await withOfflineFallback(() => updateReaderPreferencesAction(input), {
    kind: 'preferences',
    payload: input,
  });
  if (succeeded(result) && isIndexedDbAvailable()) {
    await updateAllBookSnapshots((s) => ({ ...s, preferences: { ...s.preferences, ...input } })).catch(
      (error: unknown) => console.warn('[offline] could not update downloaded preferences', error)
    );
  }
  return result;
}

/** `input.id` must be generated by the client (crypto.randomUUID()) so the UI and sync share it. */
export async function createAnnotationOrQueue(
  input: AnnotationCreatePayload
): Promise<OfflineFallbackResult<ActionResultOf<typeof createAnnotationAction>>> {
  const result = await withOfflineFallback(() => createAnnotationAction(input), {
    kind: 'annotation.create',
    payload: input,
  });
  if (succeeded(result)) {
    let row: BookAnnotationWire | null = null;
    if (result.ok && result.value.data) {
      row = annotationToWire(result.value.data);
    } else if (!result.ok && isIndexedDbAvailable()) {
      const now = new Date().toISOString();
      const ownerId = (await getOfflineBook(input.book_id).catch(() => undefined))?.owner_id ?? '';
      row = {
        id: input.id,
        book_id: input.book_id,
        user_id: ownerId,
        cfi_range: input.cfi_range,
        quote: input.quote,
        chapter_label: input.chapter_label ?? null,
        color: input.color,
        note: input.note ?? null,
        created_at: now,
        updated_at: now,
      };
    }
    if (row) {
      const added = row;
      await mirrorBook(input.book_id, (s) => ({
        ...s,
        annotations: [...s.annotations.filter((a) => a.id !== added.id), added],
      }));
    }
  }
  return result;
}

export async function updateAnnotationOrQueue(
  input: AnnotationUpdatePayload
): Promise<OfflineFallbackResult<ActionResultOf<typeof updateAnnotationAction>>> {
  const result = await withOfflineFallback(() => updateAnnotationAction(input.id, input.patch), {
    kind: 'annotation.update',
    payload: input,
  });
  if (succeeded(result)) {
    const updatedAt = new Date().toISOString();
    await mirrorBook(input.book_id, (s) => ({
      ...s,
      annotations: s.annotations.map((a) => (a.id === input.id ? { ...a, ...input.patch, updated_at: updatedAt } : a)),
    }));
  }
  return result;
}

export async function deleteAnnotationOrQueue(input: {
  id: string;
  book_id: string;
}): Promise<OfflineFallbackResult<ActionResultOf<typeof deleteAnnotationAction>>> {
  const result = await withOfflineFallback(() => deleteAnnotationAction(input.id), {
    kind: 'annotation.delete',
    payload: input,
  });
  if (!result.ok || result.value.error === null || result.value.error.code === 'NOT_FOUND') {
    await mirrorBook(input.book_id, (s) => ({ ...s, annotations: s.annotations.filter((a) => a.id !== input.id) }));
  }
  return result;
}

/**
 * Online: the server row (use its id). Queued: the UI keeps `input.local_id` as the bookmark id;
 * after sync, SyncResult.bookmark_ids maps it to the server id.
 */
export async function createBookmarkOrQueue(
  input: BookmarkCreatePayload
): Promise<OfflineFallbackResult<ActionResultOf<typeof createBookmarkAction>>> {
  const { local_id: localId, ...actionInput } = input;
  const result = await withOfflineFallback(() => createBookmarkAction(actionInput), {
    kind: 'bookmark.create',
    payload: input,
  });
  if (succeeded(result)) {
    const ownerId = (await getOfflineBook(input.book_id).catch(() => undefined))?.owner_id ?? '';
    const row =
      result.ok && result.value.data
        ? bookmarkToWire(result.value.data)
        : {
            id: localId,
            book_id: input.book_id,
            user_id: ownerId,
            cfi: input.cfi,
            chapter_label: input.chapter_label ?? null,
            excerpt: input.excerpt ?? null,
            progress: input.progress,
            created_at: new Date().toISOString(),
          };
    await mirrorBook(input.book_id, (s) => ({
      ...s,
      bookmarks: [...s.bookmarks.filter((b) => b.id !== row.id && b.cfi !== row.cfi), row],
    }));
  }
  return result;
}

export async function deleteBookmarkOrQueue(input: {
  id: string;
  book_id: string;
}): Promise<OfflineFallbackResult<ActionResultOf<typeof deleteBookmarkAction>>> {
  const result = await withOfflineFallback(() => deleteBookmarkAction(input.id), {
    kind: 'bookmark.delete',
    payload: input,
  });
  if (!result.ok || result.value.error === null || result.value.error.code === 'NOT_FOUND') {
    await mirrorBook(input.book_id, (s) => ({ ...s, bookmarks: s.bookmarks.filter((b) => b.id !== input.id) }));
  }
  return result;
}

// ── study ────────────────────────────────────────────────────────────────────

export type ReviewInput = ReviewPayload;

export type ReviewSubmitResult =
  | { ok: true; value: SubmitReviewResponseWire }
  /** Queued; `schedule` is the FSRS result computed locally (null when the deck is not downloaded). */
  | { ok: false; queued: true; schedule: ScheduleWire | null }
  /** The server refused it (4xx: card gone, forbidden, invalid). Not queued. */
  | { ok: false; queued: false; status: number; error: { code: string; message: string } };

/**
 * Runs FSRS locally on a downloaded card and stores the new schedule (offline review).
 * Returns the new schedule, or null when the card is not downloaded.
 */
export async function reviewLocally(input: Pick<ReviewInput, 'card_id' | 'rating' | 'reviewed_at'>): Promise<ScheduleWire | null> {
  if (!isIndexedDbAvailable()) return null;
  const card = await getLocalCard(input.card_id);
  if (!card) return null;
  const next = scheduleToWire(review(scheduleFromWire(card.schedule), input.rating, new Date(input.reviewed_at)));
  await updateLocalSchedule(input.card_id, next, 'local');
  return next;
}

async function queueReview(input: ReviewInput): Promise<ReviewSubmitResult> {
  await enqueue({ kind: 'review', payload: input }, { created_at: input.reviewed_at });
  const schedule = await reviewLocally(input).catch((error: unknown) => {
    console.warn('[offline] local review failed', error);
    return null;
  });
  kickFlush();
  return { ok: false, queued: true, schedule };
}

async function hasPendingReviews(): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false;
  try {
    return (await pending()).some((item) => item.kind === 'review');
  } catch {
    return false;
  }
}

/**
 * POST /api/study/review with client_review_id (server-deduplicated). Queues the review (and
 * applies it to the local copy) when offline, on a network failure or a 5xx, or while older
 * reviews are still queued (so they reach the server in order).
 * Online success also refreshes the downloaded card's schedule from the server's answer.
 */
export async function submitReviewOnlineOrQueue(input: ReviewInput): Promise<ReviewSubmitResult> {
  if (isBrowserOffline() || (await hasPendingReviews())) return queueReview(input);

  let response: Response;
  try {
    response = await fetch('/api/study/review', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: input.card_id, rating: input.rating, client_review_id: input.client_review_id }),
    });
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return queueReview(input);
  }

  if (response.status >= 500) return queueReview(input);
  const body = await readEnvelope<SubmitReviewResponseWire>(response);
  if (!response.ok || !body.data) {
    return {
      ok: false,
      queued: false,
      status: response.status,
      error: body.error ?? { code: 'INTERNAL_ERROR', message: `HTTP ${response.status}` },
    };
  }

  if (body.data.schedule && isIndexedDbAvailable()) {
    await updateLocalSchedule(input.card_id, body.data.schedule, 'server').catch((error: unknown) => {
      console.warn('[offline] could not update the downloaded card', error);
    });
  }
  return { ok: true, value: body.data };
}

