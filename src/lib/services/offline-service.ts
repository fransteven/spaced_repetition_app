import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, cards, cardSchedules, cardSources, decks } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';
import { getReaderData, type ReaderData } from '@/lib/services/book-service';
import { getBookDeckOptions, type BookDeckOptions } from '@/lib/services/book-card-service';
import { toScheduleWire, type ScheduleWire } from '@/lib/study/schedule-wire';
import { DbIdSchema } from '@/lib/validations';

// Snapshots a client stores to read and study offline (docs/plans/offline-mode.md, "Wire contract").

export interface OfflineDeckCard {
  card_id:     string;
  front:       string;
  back:        string;
  image_url_1: string | null;
  image_url_2: string | null;
  source:      { book_id: string; book_title: string; cfi_range: string } | null;
  schedule:    ScheduleWire;
}

export interface OfflineDeckSnapshot {
  deck:        { id: string; name: string; description: string | null; subject: string };
  cards:       OfflineDeckCard[];
  server_time: string;
}

export interface OfflineBookSnapshot extends ReaderData {
  deck_options: BookDeckOptions;
  file_bytes:   number;
}

export async function getOfflineDeckSnapshot(userId: string, deckId: string): Promise<OfflineDeckSnapshot> {
  if (!DbIdSchema.safeParse(deckId).success) throw new ServiceError('NOT_FOUND', 'Deck not found');

  const [deck] = await db
    .select({ id: decks.id, name: decks.name, description: decks.description, subject: decks.subject, user_id: decks.user_id })
    .from(decks)
    .where(eq(decks.id, deckId));

  if (!deck) throw new ServiceError('NOT_FOUND', 'Deck not found');
  if (deck.user_id !== userId) throw new ServiceError('FORBIDDEN', 'Access denied');

  const now = new Date();
  const rows = await db
    .select({
      card_id:        cards.id,
      front:          cards.front,
      back:           cards.back,
      image_url_1:    cards.image_url_1,
      image_url_2:    cards.image_url_2,
      stability:      cardSchedules.stability,
      difficulty:     cardSchedules.difficulty,
      state:          cardSchedules.state,
      reps:           cardSchedules.reps,
      lapses:         cardSchedules.lapses,
      elapsed_days:   cardSchedules.elapsed_days,
      scheduled_days: cardSchedules.scheduled_days,
      due_date:       cardSchedules.due_date,
      last_review:    cardSchedules.last_review,
      source_book_id: cardSources.book_id,
      source_cfi:     cardSources.cfi_range,
      source_title:   books.title,
    })
    .from(cards)
    .leftJoin(cardSchedules, and(eq(cardSchedules.card_id, cards.id), eq(cardSchedules.user_id, userId)))
    .leftJoin(cardSources, and(eq(cardSources.card_id, cards.id), eq(cardSources.user_id, userId)))
    .leftJoin(books, eq(books.id, cardSources.book_id))
    .where(eq(cards.deck_id, deckId))
    .orderBy(asc(cards.created_at));

  // A card without a schedule row (legacy data) is a new card: the column defaults of
  // card_schedules. The sync endpoint creates the row on its first offline review.
  const snapshotCards: OfflineDeckCard[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.card_id)) continue; // no unique (card, user) on card_schedules: keep the first
    seen.add(r.card_id);
    snapshotCards.push({
      card_id:     r.card_id,
      front:       r.front,
      back:        r.back,
      image_url_1: r.image_url_1,
      image_url_2: r.image_url_2,
      source:      r.source_book_id && r.source_cfi && r.source_title
        ? { book_id: r.source_book_id, book_title: r.source_title, cfi_range: r.source_cfi }
        : null,
      schedule: toScheduleWire({
        stability:      r.stability ?? 0,
        difficulty:     r.difficulty ?? 5,
        state:          r.state ?? 'new',
        reps:           r.reps ?? 0,
        lapses:         r.lapses ?? 0,
        elapsed_days:   r.elapsed_days ?? 0,
        scheduled_days: r.scheduled_days ?? 0,
        due_date:       r.due_date ?? now,
        last_review:    r.last_review,
      }),
    });
  }

  return {
    deck:        { id: deck.id, name: deck.name, description: deck.description, subject: deck.subject },
    cards:       snapshotCards,
    server_time: now.toISOString(),
  };
}

/** Same data the reader page passes to <Reader>, plus the EPUB size for the quota check. */
export async function getOfflineBookSnapshot(userId: string, bookId: string): Promise<OfflineBookSnapshot> {
  const data = await getReaderData(userId, bookId); // ownership + ready check
  const [deckOptions, [size]] = await Promise.all([
    getBookDeckOptions(userId, bookId),
    db.select({ file_size: books.file_size }).from(books).where(eq(books.id, bookId)),
  ]);
  if (!size) throw new ServiceError('NOT_FOUND', 'Book not found'); // deleted in between

  return { ...data, deck_options: deckOptions, file_bytes: size.file_size };
}
