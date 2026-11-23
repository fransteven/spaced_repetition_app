// Test helpers for the offline layer (imported by *.test.ts only).
import type { StoreNames } from 'idb';
import { getOfflineDb, type OfflineDbSchema } from './db';

const STORES: StoreNames<OfflineDbSchema>[] = ['books', 'book_blobs', 'decks', 'cards', 'outbox'];

export async function clearOfflineDb(): Promise<void> {
  const db = await getOfflineDb();
  await Promise.all(STORES.map((store) => db.clear(store)));
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
