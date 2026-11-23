import { eq, and } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { decks, cards, cardSchedules } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';
import { assertDeckOwnership } from '@/lib/services/deck-service';

type NewCard = InferInsertModel<typeof cards>;

export interface CardListItem {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  image_url_1: string | null;
  image_url_2: string | null;
  tags: string[] | null;
  created_at: Date;
  updated_at: Date;
  state: 'new' | 'learning' | 'review' | 'relearning' | null;
  stability: number | null;
  due_date: Date | null;
}

interface CardOwnershipRecord {
  id: string;
  deck_user_id: string;
}

async function getCardOwnershipRecord(cardId: string): Promise<CardOwnershipRecord | null> {
  const [card] = await db
    .select({
      id: cards.id,
      deck_user_id: decks.user_id,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deck_id))
    .where(eq(cards.id, cardId));

  return card ?? null;
}

export async function assertCardOwnership(userId: string, cardId: string): Promise<void> {
  const card = await getCardOwnershipRecord(cardId);

  if (!card) {
    throw new ServiceError('NOT_FOUND', 'Card not found');
  }

  if (card.deck_user_id !== userId) {
    throw new ServiceError('FORBIDDEN', 'Access denied');
  }
}

export async function listCardsForDeck(userId: string, deckId: string): Promise<CardListItem[]> {
  const [deck] = await db
    .select({
      id: decks.id,
      user_id: decks.user_id,
    })
    .from(decks)
    .where(eq(decks.id, deckId));

  if (!deck) {
    throw new ServiceError('NOT_FOUND', 'Deck not found');
  }

  if (deck.user_id !== userId) {
    throw new ServiceError('FORBIDDEN', 'Access denied');
  }

  return db
    .select({
      id: cards.id,
      deck_id: cards.deck_id,
      front: cards.front,
      back: cards.back,
      image_url_1: cards.image_url_1,
      image_url_2: cards.image_url_2,
      tags: cards.tags,
      created_at: cards.created_at,
      updated_at: cards.updated_at,
      state: cardSchedules.state,
      stability: cardSchedules.stability,
      due_date: cardSchedules.due_date,
    })
    .from(cards)
    .leftJoin(
      cardSchedules,
      and(eq(cardSchedules.card_id, cards.id), eq(cardSchedules.user_id, userId))
    )
    .where(eq(cards.deck_id, deckId))
    .orderBy(cards.created_at);
}

type NewCardInput = Pick<NewCard, 'front' | 'back' | 'image_url_1' | 'image_url_2' | 'tags'>;

/**
 * Creates cards in one deck together with their `card_schedules` rows, atomically: a card
 * without a schedule never shows up in a study session. Ids come from the database.
 */
export async function createCardsForUser(
  userId: string,
  deckId: string,
  items: NewCardInput[]
): Promise<(typeof cards.$inferSelect)[]> {
  await assertDeckOwnership(userId, deckId);
  if (items.length === 0) return [];

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(cards)
      .values(items.map((item) => ({ ...item, deck_id: deckId })))
      .returning();

    const now = new Date();
    await tx.insert(cardSchedules).values(
      created.map((card) => ({ card_id: card.id, user_id: userId, state: 'new' as const, due_date: now }))
    );

    return created;
  });
}

export async function createCardForUser(
  userId: string,
  data: NewCardInput & Pick<NewCard, 'deck_id'>
): Promise<typeof cards.$inferSelect> {
  const { deck_id, ...item } = data;
  const [newCard] = await createCardsForUser(userId, deck_id, [item]);
  return newCard;
}

export async function updateCardForUser(
  userId: string,
  cardId: string,
  data: Partial<Pick<NewCard, 'front' | 'back' | 'image_url_1' | 'image_url_2' | 'tags'>>
): Promise<typeof cards.$inferSelect> {
  await assertCardOwnership(userId, cardId);

  const [updatedCard] = await db
    .update(cards)
    .set({ ...data, updated_at: new Date() })
    .where(eq(cards.id, cardId))
    .returning();

  return updatedCard;
}

export async function deleteCardForUser(userId: string, cardId: string): Promise<void> {
  await assertCardOwnership(userId, cardId);

  await db.delete(cards).where(eq(cards.id, cardId));
}
