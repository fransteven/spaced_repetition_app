// Replays the outbox (browser only): reviews in batches to POST /api/study/review/sync, every
// other kind FIFO through the existing reader Server Actions. One flush at a time across tabs
// (navigator.locks), exponential backoff after a failure.
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
import { updateBookSnapshot } from './book-files';
import { updateLocalSchedule } from './deck-download';
import { readEnvelope } from './fetch-json';
import { isBrowserOffline, isNetworkError } from './network';
import { count, markFailed, onOutboxChange, pending, remove, rewritePending, type OutboxItem } from './outbox';
import type { ApiEnvelope, BookBookmarkWire, ReviewSyncResponseWire } from './types';

export const SYNC_LOCK_NAME = 'nc-offline-sync';
export const REVIEW_BATCH_SIZE = 500;
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_MAX_MS = 5 * 60_000;

export interface SyncedBookmarkId {
  book_id: string;
  local_id: string;
  id: string;
}

export interface SyncResult {
  /** Items the server accepted (applied, duplicate, or an already-deleted delete). */
  sent: number;
  /** Items kept for a later attempt (network / server error). */
  failed: number;
  /** Reviews the server discarded because another device reviewed the card later. */
  stale: number;
  /** Items dropped as unsyncable (validation error, forbidden, card/book gone). */
  dropped: number;
  /** True when no flush ran: offline, backoff, or another tab/flush holds the lock. */
  skipped: boolean;
  /** Bookmarks created offline that now have a server id (the UI should swap local_id → id). */
  bookmark_ids: SyncedBookmarkId[];
  finished_at: string;
}

export interface SyncState {
  pending: number;
  syncing: boolean;
  /** Last flush that actually ran (skipped ones are not recorded). */
  lastResult: SyncResult | null;
}

// ── state + subscriptions ────────────────────────────────────────────────────

let state: SyncState = { pending: 0, syncing: false, lastResult: null };
const listeners = new Set<(state: SyncState) => void>();
let stopOutboxListener: (() => void) | null = null;

function setState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
  for (const fn of listeners) fn(state);
}

export function getSyncState(): SyncState {
  return state;
}

/** Re-reads the outbox size and notifies subscribers. */
export async function refreshPendingCount(): Promise<number> {
  try {
    const pendingCount = await count();
    if (pendingCount !== state.pending) setState({ pending: pendingCount });
    return pendingCount;
  } catch {
    return state.pending; // IndexedDB unavailable
  }
}

/** Called with the new state on every change (pending count, syncing flag, last result). */
export function subscribe(fn: (state: SyncState) => void): () => void {
  listeners.add(fn);
  if (!stopOutboxListener) {
    stopOutboxListener = onOutboxChange(() => {
      void refreshPendingCount();
    });
  }
  void refreshPendingCount();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && stopOutboxListener) {
      stopOutboxListener();
      stopOutboxListener = null;
    }
  };
}

// ── backoff ──────────────────────────────────────────────────────────────────

let consecutiveFailures = 0;
let backoffUntil = 0;

function registerFailure(): void {
  consecutiveFailures += 1;
  backoffUntil = Date.now() + Math.min(BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1), BACKOFF_MAX_MS);
}

function registerSuccess(): void {
  consecutiveFailures = 0;
  backoffUntil = 0;
}

/** Test hook: forget backoff and state. */
export function resetSyncStateForTests(): void {
  consecutiveFailures = 0;
  backoffUntil = 0;
  inFlight = null;
  followUp = null;
  state = { pending: 0, syncing: false, lastResult: null };
}

function emptyResult(skipped = false): SyncResult {
  return { sent: 0, failed: 0, stale: 0, dropped: 0, skipped, bookmark_ids: [], finished_at: new Date().toISOString() };
}

// ── reviews ──────────────────────────────────────────────────────────────────

type ReviewItem = Extract<OutboxItem, { kind: 'review' }>;
type OtherItem = Exclude<OutboxItem, { kind: 'review' }>;

type BatchOutcome =
  | { kind: 'ok'; data: ReviewSyncResponseWire }
  | { kind: 'invalid'; message: string }
  | { kind: 'retry'; message: string };

async function postReviewBatch(items: ReviewItem[]): Promise<BatchOutcome> {
  let response: Response;
  try {
    response = await fetch('/api/study/review/sync', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews: items.map((item) => item.payload) }),
    });
  } catch (error) {
    return { kind: 'retry', message: error instanceof Error ? error.message : 'Network error' };
  }
  const body = await readEnvelope<ReviewSyncResponseWire>(response);
  if (response.ok && body.data) return { kind: 'ok', data: body.data };
  const message = body.error?.message ?? `HTTP ${response.status}`;
  if (response.status === 400 || body.error?.code === 'VALIDATION_ERROR') return { kind: 'invalid', message };
  return { kind: 'retry', message };
}

/** Returns false when the flush must stop (network / server failure). */
async function flushReviewBatch(items: ReviewItem[], result: SyncResult): Promise<boolean> {
  const outcome = await postReviewBatch(items);

  if (outcome.kind === 'retry') {
    for (const item of items) await markFailed(item.id, outcome.message);
    result.failed += items.length;
    return false;
  }

  if (outcome.kind === 'invalid') {
    if (items.length > 1) {
      // One bad item rejects the whole batch: retry one by one so only the bad ones drop.
      for (const item of items) {
        if (!(await flushReviewBatch([item], result))) return false;
      }
      return true;
    }
    console.warn('[offline-sync] dropping invalid review', items[0]?.payload, outcome.message);
    await remove(items.map((i) => i.id));
    result.dropped += items.length;
    return true;
  }

  const byClientId = new Map(items.map((item) => [item.payload.client_review_id, item]));
  const done: string[] = [];
  for (const { client_review_id, status } of outcome.data.results) {
    const item = byClientId.get(client_review_id);
    if (!item) continue;
    done.push(item.id);
    if (status === 'applied' || status === 'duplicate') result.sent += 1;
    else if (status === 'stale') result.stale += 1;
    else result.dropped += 1;
  }
  await remove(done);

  const missing = items.filter((item) => !done.includes(item.id));
  for (const item of missing) await markFailed(item.id, 'No result from the server');
  result.failed += missing.length;

  for (const { card_id, ...schedule } of outcome.data.schedules) {
    await updateLocalSchedule(card_id, schedule, 'server').catch((error: unknown) => {
      console.warn('[offline-sync] could not update local schedule', card_id, error);
    });
  }
  return true;
}

async function flushReviews(items: ReviewItem[], result: SyncResult): Promise<boolean> {
  for (let i = 0; i < items.length; i += REVIEW_BATCH_SIZE) {
    if (!(await flushReviewBatch(items.slice(i, i + REVIEW_BATCH_SIZE), result))) return false;
  }
  return true;
}

// ── reader mutations ─────────────────────────────────────────────────────────

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function callAction(item: OtherItem): Promise<ApiEnvelope<unknown>> {
  switch (item.kind) {
    case 'progress':
      return saveReadingProgressAction({ ...item.payload, client_updated_at: item.created_at });
    case 'annotation.create':
      return createAnnotationAction(item.payload);
    case 'annotation.update':
      return updateAnnotationAction(item.payload.id, item.payload.patch);
    case 'annotation.delete':
      return deleteAnnotationAction(item.payload.id);
    case 'bookmark.create': {
      const { book_id, cfi, chapter_label, excerpt, progress } = item.payload;
      return createBookmarkAction({ book_id, cfi, chapter_label, excerpt, progress });
    }
    case 'bookmark.delete':
      return deleteBookmarkAction(item.payload.id);
    case 'preferences':
      return updateReaderPreferencesAction(item.payload);
    case 'locations':
      return saveBookLocationsAction(item.payload);
  }
}

async function afterBookmarkCreated(
  item: Extract<OtherItem, { kind: 'bookmark.create' }>,
  created: BookBookmarkWire,
  result: SyncResult
): Promise<void> {
  const { local_id, book_id } = item.payload;
  result.bookmark_ids.push({ book_id, local_id, id: created.id });
  await rewritePending((queued) =>
    queued.kind === 'bookmark.delete' && queued.payload.id === local_id
      ? { ...queued, payload: { ...queued.payload, id: created.id } }
      : queued
  );
  await updateBookSnapshot(book_id, (snapshot) => ({
    ...snapshot,
    bookmarks: snapshot.bookmarks.map((b) => (b.id === local_id ? created : b)),
  })).catch(() => false);
}

function isBookmarkRow(value: unknown): value is { id: string; created_at: Date | string } {
  return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}

/** Returns false when the flush must stop. */
async function flushOther(item: OtherItem, result: SyncResult): Promise<boolean> {
  let response: ApiEnvelope<unknown>;
  try {
    response = await callAction(item);
  } catch (error) {
    // Network failure, or a Server Action that no longer exists after a deploy: keep it.
    await markFailed(item.id, error);
    result.failed += 1;
    if (!isNetworkError(error)) console.warn('[offline-sync] action threw', item.kind, error);
    return false;
  }

  if (!response.error) {
    if (item.kind === 'bookmark.create' && isBookmarkRow(response.data)) {
      const { created_at, ...rest } = response.data;
      const row: BookBookmarkWire = {
        id: rest.id,
        book_id: item.payload.book_id,
        user_id: 'user_id' in rest && typeof rest.user_id === 'string' ? rest.user_id : '',
        cfi: item.payload.cfi,
        chapter_label: item.payload.chapter_label ?? null,
        excerpt: item.payload.excerpt ?? null,
        progress: item.payload.progress,
        created_at: toIso(created_at),
      };
      await afterBookmarkCreated(item, row, result);
    }
    await remove([item.id]);
    result.sent += 1;
    return true;
  }

  const { code, message } = response.error;
  const isDelete = item.kind === 'annotation.delete' || item.kind === 'bookmark.delete';
  if (code === 'NOT_FOUND' && isDelete) {
    await remove([item.id]);
    result.sent += 1;
    return true;
  }
  if (code === 'NOT_FOUND' || code === 'VALIDATION_ERROR' || code === 'FORBIDDEN') {
    console.warn('[offline-sync] dropping', item.kind, code, message);
    await remove([item.id]);
    result.dropped += 1;
    return true;
  }
  // UNAUTHORIZED (signed out), UNAVAILABLE, INTERNAL_ERROR: keep it and stop to preserve order.
  await markFailed(item.id, `${code}: ${message}`);
  result.failed += 1;
  return false;
}

// ── flush ────────────────────────────────────────────────────────────────────

async function runFlush(force: boolean): Promise<SyncResult> {
  if (isBrowserOffline()) return emptyResult(true);
  if (!force && Date.now() < backoffUntil) return emptyResult(true);

  const result = emptyResult();
  const items = await pending();
  const reviews: ReviewItem[] = [];
  const others: OtherItem[] = [];
  for (const item of items) {
    if (item.kind === 'review') reviews.push(item);
    else others.push(item);
  }

  let completed = await flushReviews(reviews, result);
  if (completed) {
    for (const item of others) {
      if (!(await flushOther(item, result))) {
        completed = false;
        break;
      }
    }
  }

  if (completed) registerSuccess();
  else registerFailure();
  result.finished_at = new Date().toISOString();
  return result;
}

let inFlight: Promise<SyncResult> | null = null;
let followUp: Promise<SyncResult> | null = null;
let memoryLock = false;

async function withLock(fn: () => Promise<SyncResult>): Promise<SyncResult> {
  if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
    return navigator.locks.request(SYNC_LOCK_NAME, { ifAvailable: true }, async (lock) =>
      lock ? fn() : emptyResult(true)
    );
  }
  if (memoryLock) return emptyResult(true);
  memoryLock = true;
  try {
    return await fn();
  } finally {
    memoryLock = false;
  }
}

/**
 * Sends the outbox. Concurrent calls in this tab share one run; another tab holding the lock,
 * being offline, or a pending backoff (unless `force`, e.g. "Sync now") yields `skipped: true`.
 */
export function flush(options: { force?: boolean } = {}): Promise<SyncResult> {
  // A call during a run gets one follow-up run: items enqueued meanwhile are not in the
  // running batch and would otherwise wait for the next trigger (interval / online / visible).
  if (inFlight) {
    followUp ??= inFlight.then(() => {
      followUp = null;
      return flush(options);
    });
    return followUp;
  }
  const run = (async (): Promise<SyncResult> => {
    setState({ syncing: true });
    try {
      const result = await withLock(() => runFlush(options.force === true));
      if (!result.skipped) setState({ lastResult: result });
      return result;
    } finally {
      inFlight = null;
      setState({ syncing: false });
      await refreshPendingCount();
    }
  })();
  inFlight = run;
  return run;
}

/**
 * Flushes on start, when the browser comes back online (bypassing backoff), when the tab
 * becomes visible, and every `intervalMs` while items are pending. Returns the cleanup.
 */
export function startAutoSync(options: { intervalMs?: number } = {}): () => void {
  if (typeof window === 'undefined') return () => {};
  const run = (force: boolean): void => {
    flush({ force }).catch((error: unknown) => console.warn('[offline-sync] flush failed', error));
  };
  const onOnline = (): void => run(true);
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') run(false);
  };
  const unsubscribe = subscribe(() => {});
  const timer = setInterval(() => {
    if (state.pending > 0) run(false);
  }, options.intervalMs ?? 60_000);

  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  run(false);

  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
    clearInterval(timer);
    unsubscribe();
  };
}
