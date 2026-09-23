import { and, eq, lte, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cards, cardSchedules, decks, reviewLogs } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';
import { review, previewIntervals } from '@/lib/fsrs/algorithm';
import type { FsrsRating, ScheduleInput } from '@/lib/fsrs/types';
import { assertCardOwnership } from '@/lib/services/card-service';
import { getStreakStatus } from '@/lib/services/dashboard-service';

export interface StudyCardItem {
  card_id:     string;
  front:       string;
  back:        string;
  image_url_1: string | null;
  image_url_2: string | null;
  stability:   number;
  state:       'new' | 'learning' | 'review' | 'relearning';
  previews:    Record<FsrsRating, number>;
}

export interface StudySessionData {
  deckName:   string;
  cards:      StudyCardItem[];
  streakDays: number;
  reviewedTodayBeforeSession: boolean;
}

export async function getStudySession(userId: string, deckId: string): Promise<StudySessionData> {
  const [deck] = await db
    .select({ id: decks.id, name: decks.name, user_id: decks.user_id })
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
    })
    .from(cards)
    .innerJoin(
      cardSchedules,
      and(eq(cardSchedules.card_id, cards.id), eq(cardSchedules.user_id, userId)),
    )
    .where(
      and(
        eq(cards.deck_id, deckId),
        or(lte(cardSchedules.due_date, now), eq(cardSchedules.state, 'new')),
      ),
    );

  // Bucket and order per AGENTS.md §6.3
  const b1: typeof rows = [];
  const b2: typeof rows = [];
  const b3: typeof rows = [];
  const b4: typeof rows = [];
  const b5: typeof rows = [];

  for (const r of rows) {
    const isDue = r.due_date.getTime() <= now.getTime();
    if ((r.state === 'learning' || r.state === 'relearning') && isDue) {
      b1.push(r);
    } else if (r.state === 'review' && isDue && r.stability < 10) {
      b2.push(r);
    } else if (r.state === 'review' && isDue && r.stability >= 10 && r.stability < 50) {
      b3.push(r);
    } else if (r.state === 'review' && isDue && r.stability >= 50) {
      b4.push(r);
    } else if (r.state === 'new') {
      b5.push(r);
    }
  }

  // Shuffle new cards and cap at 20
  b5.sort(() => Math.random() - 0.5);
  const ordered = [...b1, ...b2, ...b3, ...b4, ...b5.slice(0, 20)];

  const studyCards: StudyCardItem[] = ordered.map(r => {
    const scheduleInput: ScheduleInput = {
      stability:      r.stability,
      difficulty:     r.difficulty,
      state:          r.state,
      reps:           r.reps,
      lapses:         r.lapses,
      elapsed_days:   r.elapsed_days,
      scheduled_days: r.scheduled_days,
      due_date:       r.due_date,
      last_review:    r.last_review,
    };

    return {
      card_id:     r.card_id,
      front:       r.front,
      back:        r.back,
      image_url_1: r.image_url_1,
      image_url_2: r.image_url_2,
      stability:   r.stability,
      state:       r.state,
      previews:    previewIntervals(scheduleInput, now),
    };
  });

  const streakStatus = await getStreakStatus(userId, now);

  return {
    deckName: deck.name,
    cards: studyCards,
    streakDays: streakStatus.days,
    reviewedTodayBeforeSession: streakStatus.reviewedToday,
  };
}

export async function submitReview(
  userId: string,
  cardId: string,
  rating: FsrsRating,
): Promise<{ scheduled_days: number; due_date: Date }> {
  await assertCardOwnership(userId, cardId);

  const result = await db.transaction((tx) => applyReview(tx, userId, cardId, rating));
  return { scheduled_days: result.scheduled_days, due_date: result.due_date };
}

type ReviewTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function applyReview(
  tx: ReviewTransaction,
  userId: string,
  cardId: string,
  rating: FsrsRating,
  expected?: { reps: number; lastReview: Date | null },
): Promise<{ scheduled_days: number; due_date: Date; review_log_id: string }> {
  const [schedule] = await tx
    .select()
    .from(cardSchedules)
    .where(and(eq(cardSchedules.card_id, cardId), eq(cardSchedules.user_id, userId)))
    .for('update');

  if (!schedule) throw new ServiceError('NOT_FOUND', 'Schedule not found');
  if (expected && (
    schedule.reps !== expected.reps ||
    schedule.last_review?.getTime() !== expected.lastReview?.getTime()
  )) {
    throw new ServiceError('FORBIDDEN', 'Card was reviewed while the exam was in progress');
  }

  const result = review(schedule, rating, new Date());

  await tx
    .update(cardSchedules)
    .set({
      stability:      result.stability,
      difficulty:     result.difficulty,
      state:          result.state,
      reps:           result.reps,
      lapses:         result.lapses,
      scheduled_days: result.scheduled_days,
      elapsed_days:   result.elapsed_days,
      due_date:       result.due_date,
      last_review:    result.last_review,
    })
    .where(eq(cardSchedules.id, schedule.id));

  const [log] = await tx.insert(reviewLogs).values({
    card_id: cardId,
    user_id: userId,
    rating,
    scheduled_days: result.scheduled_days,
    elapsed_days: result.elapsed_days,
  }).returning({ id: reviewLogs.id });

  return {
    scheduled_days: result.scheduled_days,
    due_date: result.due_date,
    review_log_id: log.id,
  };
}
