// Downloaded decks (browser only): deck + cards (with their full FSRS schedule) in IndexedDB,
// card images in Cache Storage ('nc-images-v1', CORS responses only — opaque ones are skipped).
import { getOfflineDb, type OfflineCardRecord, type OfflineDeckRecord } from './db';
import { fetchEnvelope } from './fetch-json';
import { IMAGE_CACHE_NAME, ensureSpace, requestPersistence } from './storage';
import type { OfflineDeckCardWire, OfflineDeckSnapshotWire, ScheduleWire } from './types';

export type { OfflineCardRecord, OfflineDeckRecord } from './db';

export const IMAGE_CONCURRENCY = 4;

export interface DeckDownloadProgress {
  phase: 'snapshot' | 'images' | 'done';
  /** Images processed so far (phase 'images'). */
  loaded: number;
  /** Unique images in the deck. */
  total: number;
}

export interface DeckDownloadOptions {
  onProgress?: (progress: DeckDownloadProgress) => void;
  signal?: AbortSignal;
}

function imageUrlsOf(cards: ReadonlyArray<Pick<OfflineDeckCardWire, 'image_url_1' | 'image_url_2'>>): string[] {
  const urls = new Set<string>();
  for (const card of cards) {
    if (card.image_url_1) urls.add(card.image_url_1);
    if (card.image_url_2) urls.add(card.image_url_2);
  }
  return [...urls];
}

function isNewer(a: string | null, b: string | null): boolean {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
}

async function runPool<T>(items: readonly T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await task(item);
    }
  });
  await Promise.all(workers);
}

/** Caches one image; returns its size, or null when it could not be cached (skipped). */
async function cacheImage(cache: Cache, url: string, signal: AbortSignal | undefined): Promise<number | null> {
  try {
    const hit = await cache.match(url);
    if (hit) return (await hit.blob()).size;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', signal });
    if (!response.ok || response.type === 'opaque') return null;
    const size = (await response.clone().blob()).size;
    await cache.put(url, response);
    return size;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

async function otherDecksImageUrls(excludeDeckId: string): Promise<Set<string>> {
  const db = await getOfflineDb();
  const decks = await db.getAll('decks');
  return new Set(decks.filter((d) => d.id !== excludeDeckId).flatMap((d) => d.image_urls));
}

async function dropCachedImages(urls: readonly string[]): Promise<void> {
  if (urls.length === 0 || typeof caches === 'undefined') return;
  const cache = await caches.open(IMAGE_CACHE_NAME);
  await Promise.all(urls.map((url) => cache.delete(url)));
}

/**
 * Downloads a deck for offline study: snapshot (GET /api/offline/decks/:id) → cards → images.
 * A card whose local schedule is newer than the server's (a review not yet synced) keeps it.
 * On abort the deck ends up not downloaded. Throws InsufficientStorageError / OfflineHttpError.
 */
export async function downloadDeck(
  deckId: string,
  ownerId: string,
  options: DeckDownloadOptions = {}
): Promise<OfflineDeckRecord> {
  const { onProgress, signal } = options;
  signal?.throwIfAborted();
  onProgress?.({ phase: 'snapshot', loaded: 0, total: 0 });

  const snapshot = await fetchEnvelope<OfflineDeckSnapshotWire>(
    `/api/offline/decks/${encodeURIComponent(deckId)}`,
    { signal }
  );
  // Card text is small; images are checked as they arrive (the cache write fails if full).
  await ensureSpace(JSON.stringify(snapshot).length * 2);
  await requestPersistence();
  signal?.throwIfAborted();

  const imageUrls = imageUrlsOf(snapshot.cards);
  const db = await getOfflineDb();
  const previous = await db.get('decks', deckId);

  const record: OfflineDeckRecord = {
    id: deckId,
    owner_id: ownerId,
    name: snapshot.deck.name,
    downloaded_at: new Date().toISOString(),
    image_urls: imageUrls,
    image_count: 0,
    image_bytes: 0,
    card_count: snapshot.cards.length,
    snapshot: { deck: snapshot.deck, server_time: snapshot.server_time },
  };

  {
    const tx = db.transaction(['decks', 'cards'], 'readwrite');
    const cardStore = tx.objectStore('cards');
    const existing = await cardStore.index('by_deck').getAll(deckId);
    const existingById = new Map(existing.map((c) => [c.card_id, c]));
    const keep = new Set(snapshot.cards.map((c) => c.card_id));

    for (const old of existing) {
      if (!keep.has(old.card_id)) await cardStore.delete(old.card_id);
    }
    for (const card of snapshot.cards) {
      const local = existingById.get(card.card_id);
      const keepLocal =
        local?.updated_locally_at != null && isNewer(local.schedule.last_review, card.schedule.last_review);
      await cardStore.put({
        card_id: card.card_id,
        deck_id: deckId,
        front: card.front,
        back: card.back,
        image_url_1: card.image_url_1,
        image_url_2: card.image_url_2,
        source: card.source,
        schedule: keepLocal && local ? local.schedule : card.schedule,
        updated_locally_at: keepLocal && local ? local.updated_locally_at : null,
      });
    }
    await tx.objectStore('decks').put(record);
    await tx.done;
  }

  try {
    let loaded = 0;
    onProgress?.({ phase: 'images', loaded, total: imageUrls.length });
    if (typeof caches !== 'undefined' && imageUrls.length > 0) {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      await runPool(imageUrls, IMAGE_CONCURRENCY, async (url) => {
        const size = await cacheImage(cache, url, signal);
        if (size !== null) {
          record.image_count += 1;
          record.image_bytes += size;
        }
        loaded += 1;
        onProgress?.({ phase: 'images', loaded, total: imageUrls.length });
      });
    }
    signal?.throwIfAborted();
    await db.put('decks', record);
  } catch (error) {
    // Re-download of a deck that was already offline: keep it (cards are already the fresh
    // snapshot, local unsynced schedules preserved); only some images may be missing.
    const cleanup = previous ? db.put('decks', record).then(() => undefined) : deleteDeck(deckId);
    await cleanup.catch((cleanupError: unknown) => {
      console.warn('[offline] downloadDeck cleanup failed', cleanupError);
    });
    throw error;
  }

  // Images the previous copy used that nothing references any more.
  if (previous) {
    const stillUsed = await otherDecksImageUrls(deckId);
    for (const url of imageUrls) stillUsed.add(url);
    await dropCachedImages(previous.image_urls.filter((url) => !stillUsed.has(url)));
  }

  onProgress?.({ phase: 'done', loaded: imageUrls.length, total: imageUrls.length });
  return record;
}

/** Removes the deck, its cards, and the cached images no other downloaded deck uses. */
export async function deleteDeck(deckId: string): Promise<void> {
  const db = await getOfflineDb();
  const deck = await db.get('decks', deckId);

  const tx = db.transaction(['decks', 'cards'], 'readwrite');
  const cardStore = tx.objectStore('cards');
  const cardIds = await cardStore.index('by_deck').getAllKeys(deckId);
  for (const id of cardIds) await cardStore.delete(id);
  await tx.objectStore('decks').delete(deckId);
  await tx.done;

  if (deck) {
    const stillUsed = await otherDecksImageUrls(deckId);
    await dropCachedImages(deck.image_urls.filter((url) => !stillUsed.has(url)));
  }
}

export async function getDeck(deckId: string): Promise<OfflineDeckRecord | undefined> {
  const db = await getOfflineDb();
  return db.get('decks', deckId);
}

export async function isDeckDownloaded(deckId: string): Promise<boolean> {
  return (await getDeck(deckId)) !== undefined;
}

/** Downloaded decks, newest download first. */
export async function listDecks(): Promise<OfflineDeckRecord[]> {
  const db = await getOfflineDb();
  const decks = await db.getAll('decks');
  return decks.sort((a, b) => b.downloaded_at.localeCompare(a.downloaded_at));
}

/** Every card of a downloaded deck (unordered; build the session with orderStudyCards()). */
export async function getDeckCards(deckId: string): Promise<OfflineCardRecord[]> {
  const db = await getOfflineDb();
  return db.getAllFromIndex('cards', 'by_deck', deckId);
}

export async function getLocalCard(cardId: string): Promise<OfflineCardRecord | undefined> {
  const db = await getOfflineDb();
  return db.get('cards', cardId);
}

/**
 * Replaces a downloaded card's schedule. `origin: 'server'` (a schedule the server returned)
 * clears the local-change marker. Returns false when the card is not downloaded.
 */
export async function updateLocalSchedule(
  cardId: string,
  schedule: ScheduleWire,
  origin: 'local' | 'server' = 'local'
): Promise<boolean> {
  const db = await getOfflineDb();
  const tx = db.transaction('cards', 'readwrite');
  const card = await tx.store.get(cardId);
  if (!card) {
    await tx.done;
    return false;
  }
  await tx.store.put({
    ...card,
    schedule,
    updated_locally_at: origin === 'local' ? new Date().toISOString() : null,
  });
  await tx.done;
  return true;
}
