// Outbox of mutations made while offline (or whose request failed on the network), replayed by
// sync.ts. Browser only. Items are FIFO by `seq`; a few kinds coalesce (see enqueue()).
import { getOfflineDb } from './db';
import type { ReaderPreferencesInput } from '@/lib/validations';
import type { RatingWire } from './types';

export type HighlightColorWire = 'yellow' | 'green' | 'blue' | 'pink';

export interface ReviewPayload {
  client_review_id: string;
  card_id: string;
  rating: RatingWire;
  reviewed_at: string;
}

/** saveReadingProgressAction input; client_updated_at is the item's created_at at sync time. */
export interface ProgressPayload {
  book_id: string;
  cfi: string;
  progress: number;
}

/** createAnnotationAction input with the client-generated id (idempotent on the server). */
export interface AnnotationCreatePayload {
  id: string;
  book_id: string;
  cfi_range: string;
  quote: string;
  chapter_label?: string | null;
  color: HighlightColorWire;
  note?: string | null;
}

export interface AnnotationUpdatePayload {
  id: string;
  /** Kept to mirror the change into the downloaded book's snapshot. */
  book_id: string;
  patch: { color?: HighlightColorWire; note?: string | null };
}

export interface AnnotationDeletePayload {
  id: string;
  book_id: string;
}

/**
 * createBookmarkAction input. Bookmarks get their id from the server, so the UI uses
 * `local_id` until the item syncs (sync.ts then rewrites it in the stored snapshot).
 */
export interface BookmarkCreatePayload {
  local_id: string;
  book_id: string;
  cfi: string;
  chapter_label?: string | null;
  excerpt?: string | null;
  progress: number;
}

export interface BookmarkDeletePayload {
  /** Server id, or the local_id of a bookmark created offline. */
  id: string;
  book_id: string;
}

/** updateReaderPreferencesAction input (partial; pending patches merge). */
export type PreferencesPayload = ReaderPreferencesInput;

export interface LocationsPayload {
  book_id: string;
  locations_json: string;
}

export interface OutboxPayloadMap {
  review: ReviewPayload;
  progress: ProgressPayload;
  'annotation.create': AnnotationCreatePayload;
  'annotation.update': AnnotationUpdatePayload;
  'annotation.delete': AnnotationDeletePayload;
  'bookmark.create': BookmarkCreatePayload;
  'bookmark.delete': BookmarkDeletePayload;
  preferences: PreferencesPayload;
  locations: LocationsPayload;
}

export type OutboxKind = keyof OutboxPayloadMap;

export const OUTBOX_KINDS: readonly OutboxKind[] = [
  'review',
  'progress',
  'annotation.create',
  'annotation.update',
  'annotation.delete',
  'bookmark.create',
  'bookmark.delete',
  'preferences',
  'locations',
];

/** What callers enqueue: `{ kind, payload }`, discriminated on kind. */
export type OutboxItemInput = { [K in OutboxKind]: { kind: K; payload: OutboxPayloadMap[K] } }[OutboxKind];

export interface OutboxMeta {
  /** IndexedDB key (autoIncrement) — FIFO order. */
  seq?: number;
  /** Client uuid of the item. */
  id: string;
  created_at: string;
  attempts: number;
  last_error?: string;
}

export type OutboxItem = OutboxItemInput & OutboxMeta;

// ── change notifications (this tab + other tabs) ─────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();
const CHANNEL_NAME = 'nc-offline-outbox';
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => {
      for (const fn of listeners) fn();
    };
  }
  return channel;
}

function notifyChange(): void {
  for (const fn of listeners) fn();
  getChannel()?.postMessage('changed');
}

/** Called after every outbox change (also changes made in other tabs). Returns unsubscribe. */
export function onOutboxChange(fn: Listener): () => void {
  listeners.add(fn);
  getChannel();
  return () => {
    listeners.delete(fn);
  };
}

// ── queue operations ─────────────────────────────────────────────────────────

function newId(): string {
  return crypto.randomUUID();
}

/** Older pending items that `item` makes obsolete (and whether `item` itself is still needed). */
function coalesce(
  item: OutboxItemInput,
  queued: OutboxItem[]
): { drop: OutboxItem[]; merged: OutboxItemInput | null } {
  switch (item.kind) {
    case 'progress': {
      const drop = queued.filter((q) => q.kind === 'progress' && q.payload.book_id === item.payload.book_id);
      return { drop, merged: item };
    }
    case 'locations': {
      const drop = queued.filter((q) => q.kind === 'locations' && q.payload.book_id === item.payload.book_id);
      return { drop, merged: item };
    }
    case 'preferences': {
      const drop = queued.filter((q) => q.kind === 'preferences');
      let payload: PreferencesPayload = {};
      for (const q of drop) if (q.kind === 'preferences') payload = { ...payload, ...q.payload };
      return { drop, merged: { kind: 'preferences', payload: { ...payload, ...item.payload } } };
    }
    // Deletes never cancel a pending create: the flush may already be sending it, and cancelling
    // would leave the row on the server. Creates are idempotent and deletes accept NOT_FOUND.
    default:
      return { drop: [], merged: item };
  }
}

/**
 * Adds an item (FIFO). Coalescing: a newer 'progress' / 'locations' replaces the pending one for
 * the same book; 'preferences' patches merge into one item. Returns the stored item.
 */
export async function enqueue(
  item: OutboxItemInput,
  options: { created_at?: string } = {}
): Promise<OutboxItem | null> {
  const db = await getOfflineDb();
  const tx = db.transaction('outbox', 'readwrite');
  const queued = await tx.store.getAll();
  const { drop, merged } = coalesce(item, queued);
  for (const old of drop) {
    if (old.seq !== undefined) await tx.store.delete(old.seq);
  }
  let stored: OutboxItem | null = null;
  if (merged) {
    const meta: OutboxMeta = { id: newId(), created_at: options.created_at ?? new Date().toISOString(), attempts: 0 };
    const value: OutboxItem = { ...merged, ...meta };
    const seq = await tx.store.add(value);
    stored = { ...value, seq };
  }
  await tx.done;
  notifyChange();
  return stored;
}

/** Pending items in FIFO order. */
export async function pending(): Promise<OutboxItem[]> {
  const db = await getOfflineDb();
  return db.getAll('outbox');
}

export async function count(): Promise<number> {
  const db = await getOfflineDb();
  return db.count('outbox');
}

/** Removes items by their client `id`. */
export async function remove(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getOfflineDb();
  const tx = db.transaction('outbox', 'readwrite');
  const index = tx.store.index('by_id');
  for (const id of ids) {
    const seq = await index.getKey(id);
    if (seq !== undefined) await tx.store.delete(seq);
  }
  await tx.done;
  notifyChange();
}

/** Records a failed attempt (attempts + 1, last_error). */
export async function markFailed(id: string, error: unknown): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction('outbox', 'readwrite');
  const seq = await tx.store.index('by_id').getKey(id);
  if (seq !== undefined) {
    const item = await tx.store.get(seq);
    if (item) {
      const message = error instanceof Error ? error.message : String(error);
      await tx.store.put({ ...item, attempts: item.attempts + 1, last_error: message.slice(0, 500) });
    }
  }
  await tx.done;
  notifyChange();
}

/** Rewrites pending items in place (sync uses it to swap a bookmark's local_id for the server id). */
export async function rewritePending(update: (item: OutboxItem) => OutboxItem | null): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction('outbox', 'readwrite');
  let cursor = await tx.store.openCursor();
  let changed = false;
  while (cursor) {
    const next = update(cursor.value);
    if (next !== cursor.value) {
      changed = true;
      if (next === null) await cursor.delete();
      else await cursor.update(next);
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  if (changed) notifyChange();
}
