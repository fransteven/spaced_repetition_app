// Quota, persistence and wipe of everything the offline layer stores (browser only).
import { deleteDB } from 'idb';
import { OFFLINE_DB_NAME, closeOfflineDb, getOfflineDb, isIndexedDbAvailable } from './db';

export const IMAGE_CACHE_NAME = 'nc-images-v1';
export const OPFS_BOOKS_DIR = 'books';
/** Headroom required on top of the bytes to download (10 %). */
export const SPACE_SAFETY_FACTOR = 1.1;

export interface StorageUsage {
  /** False where navigator.storage.estimate() is missing: usage/quota are then 0. */
  supported: boolean;
  usage: number;
  quota: number;
  persisted: boolean;
}

export class InsufficientStorageError extends Error {
  readonly needed: number;
  readonly available: number;

  constructor(needed: number, available: number) {
    super(`Not enough storage: need ${needed} bytes, ${available} available`);
    this.name = 'InsufficientStorageError';
    this.needed = needed;
    this.available = available;
  }
}

function storageManager(): StorageManager | null {
  if (typeof navigator === 'undefined' || !navigator.storage) return null;
  return navigator.storage;
}

export async function getUsage(): Promise<StorageUsage> {
  const manager = storageManager();
  if (!manager || typeof manager.estimate !== 'function') {
    return { supported: false, usage: 0, quota: 0, persisted: false };
  }
  const [estimate, persisted] = await Promise.all([
    manager.estimate(),
    typeof manager.persisted === 'function' ? manager.persisted().catch(() => false) : Promise.resolve(false),
  ]);
  return { supported: true, usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted };
}

/** Asks the browser not to evict our data. Resolves true when storage is (now) persistent. */
export async function requestPersistence(): Promise<boolean> {
  const manager = storageManager();
  if (!manager || typeof manager.persist !== 'function') return false;
  try {
    if (typeof manager.persisted === 'function' && (await manager.persisted())) return true;
    return await manager.persist();
  } catch {
    return false;
  }
}

/**
 * Throws InsufficientStorageError when `bytes` (+10 %) does not fit in the remaining quota.
 * Where the quota cannot be read the download is allowed (the write itself fails if it does not fit).
 */
export async function ensureSpace(bytes: number): Promise<void> {
  const usage = await getUsage();
  if (!usage.supported || usage.quota <= 0) return;
  const available = Math.max(0, usage.quota - usage.usage);
  const needed = Math.ceil(bytes * SPACE_SAFETY_FACTOR);
  if (available < needed) throw new InsufficientStorageError(needed, available);
}

export function isOpfsAvailable(): boolean {
  const manager = storageManager();
  return !!manager && typeof manager.getDirectory === 'function';
}

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError';
}

/** Deletes the IndexedDB database, the OPFS books folder and the card image cache. */
export async function wipeAll(): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (isIndexedDbAvailable()) {
    tasks.push(
      closeOfflineDb().then(() =>
        deleteDB(OFFLINE_DB_NAME, {
          blocked() {
            console.warn('[offline] wipeAll: database deletion is waiting for other tabs to close it');
          },
        })
      )
    );
  }

  const manager = storageManager();
  if (manager && typeof manager.getDirectory === 'function') {
    tasks.push(
      manager
        .getDirectory()
        .then((root) => root.removeEntry(OPFS_BOOKS_DIR, { recursive: true }))
        .catch((error: unknown) => {
          if (!isNotFound(error)) throw error;
        })
    );
  }

  if (typeof caches !== 'undefined') {
    tasks.push(caches.delete(IMAGE_CACHE_NAME));
  }

  const results = await Promise.allSettled(tasks);
  const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failure) throw failure.reason;
}

/**
 * Wipes all offline data when it belongs to another user (call on app start with the session user).
 * Returns true when a wipe happened.
 */
/** Last account that used the offline store; covers queued changes with nothing downloaded. */
const OWNER_MARKER_KEY = 'nc-offline-owner';

function readOwnerMarker(): string | null {
  try {
    return window.localStorage.getItem(OWNER_MARKER_KEY);
  } catch {
    return null;
  }
}

function writeOwnerMarker(userId: string): void {
  try {
    window.localStorage.setItem(OWNER_MARKER_KEY, userId);
  } catch {
    // storage disabled: the books/decks owner check still applies
  }
}

export async function checkOwner(userId: string): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false;
  const marker = readOwnerMarker();
  const db = await getOfflineDb();
  const [books, decks] = await Promise.all([db.getAll('books'), db.getAll('decks')]);
  const foreign =
    (marker !== null && marker !== userId) || [...books, ...decks].some((record) => record.owner_id !== userId);
  if (foreign) await wipeAll();
  writeOwnerMarker(userId);
  return foreign;
}
