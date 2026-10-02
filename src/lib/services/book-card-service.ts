import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { bookAnnotations, books, cardSources, cards, decks } from '@/lib/db/schema';
import { callLlmService } from '@/lib/llm-client';
import { assertBookOwnership } from '@/lib/services/book-service';
import { createAnnotation, type BookAnnotation } from '@/lib/services/annotation-service';
import { createCardForUser } from '@/lib/services/card-service';
import { createDeckForUser } from '@/lib/services/deck-service';
import { reserveLlmCall } from '@/lib/services/llm-usage-service';
import { ServiceError } from '@/lib/services/service-error';

type HighlightColor = BookAnnotation['color'];

export interface DeckOption {
  id: string;
  name: string;
}

export interface BookDeckOptions {
  decks: DeckOption[];
  default_deck_id: string | null; // deck of the last card made from this book
}

export interface CardSuggestion {
  front: string;
  back: string;
}

export interface CreatedBookCard {
  card_id: string;
  deck: DeckOption;
  annotation: BookAnnotation | null; // set when a new highlight was created
}

// ── Deck picker ──────────────────────────────────────────────────────────────

export async function getBookDeckOptions(userId: string, bookId: string): Promise<BookDeckOptions> {
  const [deckRows, [last]] = await Promise.all([
    db.select({ id: decks.id, name: decks.name }).from(decks).where(eq(decks.user_id, userId)).orderBy(asc(decks.name)),
    db
      .select({ deck_id: cards.deck_id })
      .from(cardSources)
      .innerJoin(cards, eq(cards.id, cardSources.card_id))
      .where(and(eq(cardSources.book_id, bookId), eq(cardSources.user_id, userId)))
      .orderBy(desc(cardSources.created_at))
      .limit(1),
  ]);
  return { decks: deckRows, default_deck_id: last?.deck_id ?? null };
}

// ── AI suggestion ────────────────────────────────────────────────────────────

// Reply of srs-llm-api (POST /v1/llm/suggest-card), which owns the prompt and the OpenAI call.
const SuggestionSchema = z.object({
  front: z.string().min(1).max(2000),
  back: z.string().min(1).max(2000),
});

export async function suggestCardFromPassage(
  userId: string,
  input: { book_id: string; quote: string; context?: string | null; chapter_label?: string | null; translation?: string | null }
): Promise<CardSuggestion> {
  await assertBookOwnership(userId, input.book_id);
  const [book] = await db
    .select({ title: books.title, author: books.author })
    .from(books)
    .where(eq(books.id, input.book_id));

  await reserveLlmCall(userId, 'suggest');
  const suggestion = await callLlmService(
    '/v1/llm/suggest-card',
    {
      book: { title: book?.title ?? 'Unknown', author: book?.author ?? null },
      chapter_label: input.chapter_label ?? null,
      context: input.context ?? null,
      quote: input.quote,
      translation: input.translation ?? null,
    },
    SuggestionSchema
  );
  return { front: suggestion.front.trim(), back: suggestion.back.trim() };
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createCardFromBook(
  userId: string,
  input: {
    book_id: string;
    deck: { id: string } | { new_name: string };
    front: string;
    back: string;
    annotation_id?: string | null;
    // Used to create a highlight when the card comes from a plain selection.
    selection?: { cfi_range: string; quote: string; chapter_label?: string | null; color: HighlightColor } | null;
  }
): Promise<CreatedBookCard> {
  await assertBookOwnership(userId, input.book_id);

  let cfiRange: string;
  let annotation: BookAnnotation | null = null;
  let annotationId: string | null = null;

  if (input.annotation_id) {
    const [existing] = await db
      .select({ user_id: bookAnnotations.user_id, book_id: bookAnnotations.book_id, cfi_range: bookAnnotations.cfi_range })
      .from(bookAnnotations)
      .where(eq(bookAnnotations.id, input.annotation_id));
    if (!existing) throw new ServiceError('NOT_FOUND', 'Highlight not found');
    if (existing.user_id !== userId || existing.book_id !== input.book_id) {
      throw new ServiceError('FORBIDDEN', 'Access denied');
    }
    cfiRange = existing.cfi_range;
    annotationId = input.annotation_id;
  } else if (input.selection) {
    cfiRange = input.selection.cfi_range;
  } else {
    throw new ServiceError('VALIDATION_ERROR', 'A highlight or a selection is required');
  }

  // Deck first: a bad deck id must not leave a stray highlight behind.
  let deck: DeckOption;
  if ('id' in input.deck) {
    const [row] = await db
      .select({ id: decks.id, name: decks.name, user_id: decks.user_id })
      .from(decks)
      .where(eq(decks.id, input.deck.id));
    if (!row) throw new ServiceError('NOT_FOUND', 'Deck not found');
    if (row.user_id !== userId) throw new ServiceError('FORBIDDEN', 'Access denied');
    deck = { id: row.id, name: row.name };
  } else {
    const created = await createDeckForUser(userId, {
      name: input.deck.new_name,
      description: 'Cards created while reading.',
      subject: 'Reading',
    });
    deck = { id: created.id, name: created.name };
  }

  if (!annotationId && input.selection) {
    annotation = await createAnnotation(userId, { book_id: input.book_id, ...input.selection });
    annotationId = annotation.id;
  }

  const card = await createCardForUser(userId, {
    deck_id: deck.id,
    front: input.front,
    back: input.back,
    tags: [],
  });

  await db.insert(cardSources).values({
    card_id: card.id,
    user_id: userId,
    book_id: input.book_id,
    annotation_id: annotationId,
    cfi_range: cfiRange,
  });

  return { card_id: card.id, deck, annotation };
}
