import { eq, and, sql } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { decks, cards, cardSchedules } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';

type NewDeck = InferInsertModel<typeof decks>;

export interface DeckListItem {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  created_at: Date;
  total_cards: number;
  due_count: number;
  learning_count: number;
  mastered_count: number;
  last_review: string | null;
}

export interface DeckListPageItem extends Omit<DeckListItem, 'created_at'> {
  created_at: string;
}

export interface DeckDetailItem {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  created_at: Date;
  user_id: string;
  total_cards: number;
  due_count: number;
}

interface DeckOwnershipRecord {
  id: string;
  user_id: string;
}

async function getDeckOwnershipRecord(deckId: string): Promise<DeckOwnershipRecord | null> {
  const [deck] = await db
    .select({
      id: decks.id,
      user_id: decks.user_id,
    })
    .from(decks)
    .where(eq(decks.id, deckId));

  return deck ?? null;
}

export async function assertDeckOwnership(userId: string, deckId: string): Promise<void> {
  const deck = await getDeckOwnershipRecord(deckId);

  if (!deck) {
    throw new ServiceError('NOT_FOUND', 'Deck not found');
  }

  if (deck.user_id !== userId) {
    throw new ServiceError('FORBIDDEN', 'Access denied');
  }
}

export async function listDecksForUser(userId: string): Promise<DeckListItem[]> {
  return db
    .select({
      id: decks.id,
      name: decks.name,
      description: decks.description,
      subject: decks.subject,
      created_at: decks.created_at,
      total_cards: sql<number>`cast(count(distinct ${cards.id}) as int)`,
      due_count: sql<number>`cast(count(distinct case when ${cardSchedules.due_date} <= now() then ${cards.id} end) as int)`,
      learning_count: sql<number>`cast(count(distinct case when ${cardSchedules.state} in ('new','learning','relearning') then ${cards.id} end) as int)`,
      mastered_count: sql<number>`cast(count(distinct case when ${cardSchedules.state} = 'review' and ${cardSchedules.stability} >= 50 then ${cards.id} end) as int)`,
      last_review: sql<string | null>`max(${cardSchedules.last_review})`,
    })
    .from(decks)
    .leftJoin(cards, eq(cards.deck_id, decks.id))
    .leftJoin(
      cardSchedules,
      and(eq(cardSchedules.card_id, cards.id), eq(cardSchedules.user_id, userId))
    )
    .where(eq(decks.user_id, userId))
    .groupBy(decks.id);
}

export async function listDecksForUserPage(userId: string): Promise<DeckListPageItem[]> {
  const items = await listDecksForUser(userId);

  return items.map((item) => ({
    ...item,
    created_at: item.created_at.toISOString(),
  }));
}

export async function getDeckDetailForUser(userId: string, deckId: string): Promise<DeckDetailItem> {
  const [deck] = await db
    .select({
      id: decks.id,
      name: decks.name,
      description: decks.description,
      subject: decks.subject,
      created_at: decks.created_at,
      user_id: decks.user_id,
      total_cards: sql<number>`cast(count(distinct ${cards.id}) as int)`,
      due_count: sql<number>`cast(count(distinct case when ${cardSchedules.due_date} <= now() then ${cards.id} end) as int)`,
    })
    .from(decks)
    .leftJoin(cards, eq(cards.deck_id, decks.id))
    .leftJoin(
      cardSchedules,
      and(eq(cardSchedules.card_id, cards.id), eq(cardSchedules.user_id, userId))
    )
    .where(and(eq(decks.id, deckId), eq(decks.user_id, userId)))
    .groupBy(decks.id);

  if (!deck) {
    throw new ServiceError('NOT_FOUND', 'Deck not found');
  }

  return deck;
}

export async function createDeckForUser(
  userId: string,
  data: Pick<NewDeck, 'name' | 'description' | 'subject'>
): Promise<typeof decks.$inferSelect> {
  const [deck] = await db
    .insert(decks)
    .values({ ...data, user_id: userId })
    .returning();

  return deck;
}

export async function updateDeckForUser(
  userId: string,
  deckId: string,
  data: Partial<Pick<NewDeck, 'name' | 'description' | 'subject'>>
): Promise<typeof decks.$inferSelect> {
  await assertDeckOwnership(userId, deckId);

  const [updatedDeck] = await db
    .update(decks)
    .set(data)
    .where(eq(decks.id, deckId))
    .returning();

  return updatedDeck;
}

export async function deleteDeckForUser(userId: string, deckId: string): Promise<void> {
  await assertDeckOwnership(userId, deckId);

  await db.delete(decks).where(eq(decks.id, deckId));
}
