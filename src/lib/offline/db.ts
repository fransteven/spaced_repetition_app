// IndexedDB schema of the offline layer (browser only). Files live in OPFS (book-files.ts),
// card images in Cache Storage (deck-download.ts); everything else lives here.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CardSourceWire, OfflineBookSnapshotWire, OfflineDeckSnapshotWire, ScheduleWire } from './types';
import type { OutboxItem } from './outbox';

export const OFFLINE_DB_NAME = 'neurocards-offline';
export const OFFLINE_DB_VERSION = 1;

export interface OfflineBookRecord {
  id: string;
  owner_id: string;
  title: string;
  author: string | null;
  has_cover: boolean;
  /** EPUB size in bytes (plus the cover, if any, in cover_bytes). */
  bytes: number;
  cover_bytes: number;
  storage: 'opfs' | 'idb';
  downloaded_at: string;
  snapshot: OfflineBookSnapshotWire;
}

/** Fallback storage for EPUBs/covers when OPFS streaming is unavailable. id = book id or `<id>:cover`. */
export interface OfflineBlobRecord {
  id: string;
  blob: Blob;
}

export interface OfflineDeckRecord {
  id: string;
  owner_id: string;
  name: string;
  downloaded_at: string;
  /** Unique card image URLs referenced by this deck (used to refcount the image cache). */
  image_urls: string[];
  /** How many of image_urls were cached successfully, and their total size. */
  image_count: number;
  image_bytes: number;
  card_count: number;
  snapshot: Omit<OfflineDeckSnapshotWire, 'cards'>;
}

export interface OfflineCardRecord {
  card_id: string;
  deck_id: string;
  front: string;
  back: string;
  image_url_1: string | null;
  image_url_2: string | null;
  source: CardSourceWire | null;
  schedule: ScheduleWire;
  /** ISO time of the last local schedule change (null = as downloaded from the server). */
  updated_locally_at: string | null;
}

export interface OfflineDbSchema extends DBSchema {
  books: { key: string; value: OfflineBookRecord };
  book_blobs: { key: string; value: OfflineBlobRecord };
  decks: { key: string; value: OfflineDeckRecord };
  cards: { key: string; value: OfflineCardRecord; indexes: { by_deck: string } };
  outbox: { key: number; value: OutboxItem; indexes: { by_id: string } };
}

export type OfflineDb = IDBPDatabase<OfflineDbSchema>;

let dbPromise: Promise<OfflineDb> | null = null;

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** Opens (once) the offline database. Rejects where IndexedDB is unavailable (SSR, old browsers). */
export function getOfflineDb(): Promise<OfflineDb> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available'));
  }
  if (!dbPromise) {
    dbPromise = openDB<OfflineDbSchema>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('books', { keyPath: 'id' });
        db.createObjectStore('book_blobs', { keyPath: 'id' });
        db.createObjectStore('decks', { keyPath: 'id' });
        const cards = db.createObjectStore('cards', { keyPath: 'card_id' });
        cards.createIndex('by_deck', 'deck_id');
        const outbox = db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
        outbox.createIndex('by_id', 'id', { unique: true });
      },
      // Another tab wants to delete/upgrade the database (wipeAll): let it.
      blocking() {
        void closeOfflineDb();
      },
      terminated() {
        dbPromise = null;
      },
    }).catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Closes the shared connection (needed before deleteDB). */
export async function closeOfflineDb(): Promise<void> {
  const pending = dbPromise;
  dbPromise = null;
  if (!pending) return;
  try {
    (await pending).close();
  } catch {
    // opening had failed: nothing to close
  }
}
