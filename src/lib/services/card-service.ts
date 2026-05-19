import { eq, and } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { decks, cards, cardSchedules } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';

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

export async function createCardForUser(
  userId: string,
  data: Pick<NewCard, 'deck_id' | 'front' | 'back' | 'image_url_1' | 'image_url_2' | 'tags'>
): Promise<typeof cards.$inferSelect> {
  const [deck] = await db
    .select({
      id: decks.id,
      user_id: decks.user_id,
    })
    .from(decks)
    .where(eq(decks.id, data.deck_id));

  if (!deck) {
    throw new ServiceError('NOT_FOUND', 'Deck not found');
  }

  if (deck.user_id !== userId) {
    throw new ServiceError('FORBIDDEN', 'Access denied');
  }

  const [newCard] = await db.insert(cards).values(data).returning();

  await db.insert(cardSchedules).values({
    card_id: newCard.id,
    user_id: userId,
    state: 'new',
    due_date: new Date(),
  });

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
