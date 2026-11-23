// Downloaded EPUBs (browser only): the file streams into OPFS (`books/<id>.epub`), with an
// IndexedDB Blob fallback where OPFS writable streams are missing; metadata + the reader
// snapshot live in the `books` store.
import { getOfflineDb, type OfflineBookRecord } from './db';
import { OfflineHttpError, fetchEnvelope } from './fetch-json';
import { OPFS_BOOKS_DIR, ensureSpace, isOpfsAvailable, requestPersistence } from './storage';
import type { OfflineBookSnapshotWire } from './types';

export type { OfflineBookRecord } from './db';

export interface BookDownloadProgress {
  phase: 'snapshot' | 'file' | 'cover' | 'done';
  /** Bytes of the EPUB written so far (phase 'file'), else 0 / total. */
  loaded: number;
  total: number;
}

export interface BookDownloadOptions {
  onProgress?: (progress: BookDownloadProgress) => void;
  signal?: AbortSignal;
  /** Skip the cover request when known to be false (LibraryBook.has_cover). Default: try it. */
  hasCover?: boolean;
}

/** The book is not (fully) downloaded on this device. */
export class OfflineBookMissingError extends Error {
  constructor(bookId: string) {
    super(`Book ${bookId} is not downloaded`);
    this.name = 'OfflineBookMissingError';
  }
}

interface MovableFileHandle extends FileSystemFileHandle {
  move(newName: string): Promise<void>;
}

function isMovable(handle: FileSystemFileHandle): handle is MovableFileHandle {
  return 'move' in handle && typeof handle.move === 'function';
}

function epubName(bookId: string): string {
  return `${bookId}.epub`;
}

function partName(bookId: string): string {
  return `${bookId}.part`;
}

function coverName(bookId: string): string {
  return `${bookId}.cover`;
}

function coverBlobKey(bookId: string): string {
  return `${bookId}:cover`;
}

/** OPFS with writable streams (Chrome, Edge, Firefox, Safari 26+). */
export function canStreamToOpfs(): boolean {
  return (
    isOpfsAvailable() &&
    typeof FileSystemFileHandle !== 'undefined' &&
    typeof FileSystemFileHandle.prototype.createWritable === 'function'
  );
}

async function booksDir(create: boolean): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(OPFS_BOOKS_DIR, { create });
}

async function removeOpfsEntry(dir: FileSystemDirectoryHandle, name: string): Promise<void> {
  try {
    await dir.removeEntry(name);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error;
  }
}

async function removeOpfsFiles(bookId: string): Promise<void> {
  if (!isOpfsAvailable()) return;
  let dir: FileSystemDirectoryHandle;
  try {
    dir = await booksDir(false);
  } catch {
    return; // no books folder yet
  }
  await Promise.all([epubName(bookId), partName(bookId), coverName(bookId)].map((name) => removeOpfsEntry(dir, name)));
}

async function removeOpfsPart(bookId: string): Promise<void> {
  if (!isOpfsAvailable()) return;
  try {
    await removeOpfsEntry(await booksDir(false), partName(bookId));
  } catch {
    // no books folder: nothing to clean
  }
}

async function removeIdbBlobs(bookId: string): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction('book_blobs', 'readwrite');
  await Promise.all([tx.store.delete(bookId), tx.store.delete(coverBlobKey(bookId)), tx.done]);
}

function byteCounter(onChunk: (bytes: number) => void): TransformStream<Uint8Array, Uint8Array> {
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      onChunk(chunk.byteLength);
      controller.enqueue(chunk);
    },
  });
}

async function writeStreamToOpfs(
  bookId: string,
  body: ReadableStream<Uint8Array>,
  onChunk: (bytes: number) => void,
  signal: AbortSignal | undefined
): Promise<void> {
  const dir = await booksDir(true);
  const part = await dir.getFileHandle(partName(bookId), { create: true });
  // Without move() the file is written under its final name; the `books` row is only
  // written after close, so a half-written file is never treated as downloaded.
  const target = isMovable(part) ? part : await dir.getFileHandle(epubName(bookId), { create: true });
  if (target !== part) await removeOpfsEntry(dir, partName(bookId));

  const writable = await target.createWritable();
  await body.pipeThrough(byteCounter(onChunk)).pipeTo(writable, { signal });

  if (target === part && isMovable(part)) {
    await removeOpfsEntry(dir, epubName(bookId));
    await part.move(epubName(bookId));
  }
}

async function collectStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (bytes: number) => void,
  signal: AbortSignal | undefined
): Promise<Blob> {
  const reader = body.getReader();
  const chunks: BlobPart[] = [];
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new Uint8Array(value));
      onChunk(value.byteLength);
    }
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks, { type: 'application/epub+zip' });
}

async function downloadCover(bookId: string, useOpfs: boolean, signal: AbortSignal | undefined): Promise<number> {
  let response: Response;
  try {
    response = await fetch(`/api/books/${encodeURIComponent(bookId)}/cover`, { credentials: 'same-origin', signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    return 0; // a cover is optional
  }
  if (!response.ok) return 0;
  const blob = await response.blob();

  if (useOpfs) {
    const dir = await booksDir(true);
    const handle = await dir.getFileHandle(coverName(bookId), { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } else {
    const db = await getOfflineDb();
    await db.put('book_blobs', { id: coverBlobKey(bookId), blob });
  }
  return blob.size;
}

/**
 * Downloads a book for offline reading: snapshot (GET /api/offline/books/:id) → quota check →
 * EPUB (GET /api/books/:id/file, streamed) → cover → `books` row. Re-downloading replaces the
 * stored copy. On failure or abort nothing is left behind (the book ends up not downloaded).
 * Throws InsufficientStorageError (storage.ts), OfflineHttpError, or the fetch/abort error.
 */
export async function downloadBook(
  bookId: string,
  ownerId: string,
  options: BookDownloadOptions = {}
): Promise<OfflineBookRecord> {
  const { onProgress, signal, hasCover } = options;
  signal?.throwIfAborted();
  onProgress?.({ phase: 'snapshot', loaded: 0, total: 0 });

  const snapshot = await fetchEnvelope<OfflineBookSnapshotWire>(
    `/api/offline/books/${encodeURIComponent(bookId)}`,
    { signal }
  );
  await ensureSpace(snapshot.file_bytes);
  await requestPersistence();
  // A failed re-download must keep the previous good copy: OPFS writable streams only commit on
  // close (an aborted write leaves the old file untouched) and the IDB blob is put atomically.
  const previous = await getOfflineBook(bookId);

  try {
    const response = await fetch(`/api/books/${encodeURIComponent(bookId)}/file`, {
      credentials: 'same-origin',
      signal,
    });
    if (!response.ok) {
      throw new OfflineHttpError(response.status, response.status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', 'Book file request failed');
    }

    const total = Number(response.headers.get('Content-Length')) || snapshot.file_bytes;
    let loaded = 0;
    const onChunk = (bytes: number): void => {
      loaded += bytes;
      onProgress?.({ phase: 'file', loaded, total });
    };
    onProgress?.({ phase: 'file', loaded: 0, total });

    const useOpfs = canStreamToOpfs() && response.body !== null;
    if (useOpfs && response.body) {
      await writeStreamToOpfs(bookId, response.body, onChunk, signal);
    } else {
      const blob = response.body ? await collectStream(response.body, onChunk, signal) : await response.blob();
      loaded = blob.size;
      const db = await getOfflineDb();
      await db.put('book_blobs', { id: bookId, blob });
    }

    onProgress?.({ phase: 'cover', loaded, total });
    const coverBytes = hasCover === false ? 0 : await downloadCover(bookId, useOpfs, signal);
    signal?.throwIfAborted();

    // Drop leftovers of a previous copy kept in the other storage.
    if (useOpfs) await removeIdbBlobs(bookId);
    else await removeOpfsFiles(bookId);

    const record: OfflineBookRecord = {
      id: bookId,
      owner_id: ownerId,
      title: snapshot.book.title,
      author: snapshot.book.author,
      has_cover: coverBytes > 0,
      bytes: loaded,
      cover_bytes: coverBytes,
      storage: useOpfs ? 'opfs' : 'idb',
      downloaded_at: new Date().toISOString(),
      snapshot,
    };
    const db = await getOfflineDb();
    await db.put('books', record);
    onProgress?.({ phase: 'done', loaded, total });
    return record;
  } catch (error) {
    const cleanup = previous ? removeOpfsPart(bookId) : deleteBook(bookId);
    await cleanup.catch((cleanupError: unknown) => {
      console.warn('[offline] downloadBook cleanup failed', cleanupError);
    });
    throw error;
  }
}

export async function getOfflineBook(bookId: string): Promise<OfflineBookRecord | undefined> {
  const db = await getOfflineDb();
  return db.get('books', bookId);
}

export async function isBookDownloaded(bookId: string): Promise<boolean> {
  return (await getOfflineBook(bookId)) !== undefined;
}

/** Downloaded books, newest download first. */
export async function listBooks(): Promise<OfflineBookRecord[]> {
  const db = await getOfflineDb();
  const books = await db.getAll('books');
  return books.sort((a, b) => b.downloaded_at.localeCompare(a.downloaded_at));
}

/** The EPUB bytes (for epub.js). Throws OfflineBookMissingError when not downloaded. */
export async function readBook(bookId: string): Promise<ArrayBuffer> {
  const record = await getOfflineBook(bookId);
  if (!record) throw new OfflineBookMissingError(bookId);
  try {
    if (record.storage === 'opfs') {
      const dir = await booksDir(false);
      const handle = await dir.getFileHandle(epubName(bookId));
      return await (await handle.getFile()).arrayBuffer();
    }
    const db = await getOfflineDb();
    const stored = await db.get('book_blobs', bookId);
    if (!stored) throw new OfflineBookMissingError(bookId);
    return await stored.blob.arrayBuffer();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') throw new OfflineBookMissingError(bookId);
    throw error;
  }
}

/** An object URL for the stored cover (caller must URL.revokeObjectURL it), or null. */
export async function readCoverUrl(bookId: string): Promise<string | null> {
  const record = await getOfflineBook(bookId);
  if (!record?.has_cover) return null;
  try {
    let blob: Blob | undefined;
    if (record.storage === 'opfs') {
      const dir = await booksDir(false);
      blob = await (await dir.getFileHandle(coverName(bookId))).getFile();
    } else {
      const db = await getOfflineDb();
      blob = (await db.get('book_blobs', coverBlobKey(bookId)))?.blob;
    }
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

/** Removes the downloaded copy (files + row). Safe to call when not downloaded. */
export async function deleteBook(bookId: string): Promise<void> {
  await Promise.all([removeOpfsFiles(bookId), removeIdbBlobs(bookId)]);
  const db = await getOfflineDb();
  await db.delete('books', bookId);
}

/**
 * Read-modify-write of a downloaded book's snapshot (to mirror local changes: progress,
 * annotations, bookmarks…). Returns false when the book is not downloaded.
 */
export async function updateBookSnapshot(
  bookId: string,
  update: (snapshot: OfflineBookSnapshotWire) => OfflineBookSnapshotWire
): Promise<boolean> {
  const db = await getOfflineDb();
  const tx = db.transaction('books', 'readwrite');
  const record = await tx.store.get(bookId);
  if (!record) {
    await tx.done;
    return false;
  }
  await tx.store.put({ ...record, snapshot: update(record.snapshot) });
  await tx.done;
  return true;
}

/** Applies `update` to every downloaded book's snapshot (e.g. reader preferences, which are global). */
export async function updateAllBookSnapshots(
  update: (snapshot: OfflineBookSnapshotWire) => OfflineBookSnapshotWire
): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction('books', 'readwrite');
  let cursor = await tx.store.openCursor();
  while (cursor) {
    await cursor.update({ ...cursor.value, snapshot: update(cursor.value.snapshot) });
    cursor = await cursor.continue();
  }
  await tx.done;
}

/**
 * Replaces the stored snapshot with the server's (keeps the file). Call after a successful
 * flush, otherwise changes still in the outbox disappear from the local copy until they sync.
 */
export async function refreshBookSnapshot(bookId: string, signal?: AbortSignal): Promise<boolean> {
  if (!(await isBookDownloaded(bookId))) return false;
  const snapshot = await fetchEnvelope<OfflineBookSnapshotWire>(
    `/api/offline/books/${encodeURIComponent(bookId)}`,
    { signal }
  );
  return updateBookSnapshot(bookId, () => snapshot);
}
