import { and, eq, inArray, lte, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, cards, cardSchedules, cardSources, decks, reviewLogs } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';
import { review, previewIntervals } from '@/lib/fsrs/algorithm';
import type { FsrsRating, ReviewResult, ScheduleInput } from '@/lib/fsrs/types';
import { orderStudyCards } from '@/lib/study/order-cards';
import { toScheduleWire, type ScheduleWire } from '@/lib/study/schedule-wire';
import {
  decideOfflineReview,
  isUniqueViolation,
  sortByReviewedAt,
  type OfflineReviewStatus,
} from '@/lib/study/offline-review-decision';
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
  source:      { book_id: string; book_title: string; cfi_range: string } | null; // card made while reading
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
      source_book_id: cardSources.book_id,
      source_cfi:     cardSources.cfi_range,
      source_title:   books.title,
    })
    .from(cards)
    .innerJoin(
      cardSchedules,
      and(eq(cardSchedules.card_id, cards.id), eq(cardSchedules.user_id, userId)),
    )
    .leftJoin(cardSources, and(eq(cardSources.card_id, cards.id), eq(cardSources.user_id, userId)))
    .leftJoin(books, eq(books.id, cardSources.book_id))
    .where(
      and(
        eq(cards.deck_id, deckId),
        or(lte(cardSchedules.due_date, now), eq(cardSchedules.state, 'new')),
      ),
    );

  // Bucket and order per AGENTS.md §6.3 (shared with the offline study shell)
  const ordered = orderStudyCards(rows, now);

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
      source:      r.source_book_id && r.source_cfi && r.source_title
        ? { book_id: r.source_book_id, book_title: r.source_title, cfi_range: r.source_cfi }
        : null,
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

const CLIENT_REVIEW_ID_CONSTRAINT = 'review_logs_client_review_id_unique';

export interface SubmittedReview {
  scheduled_days: number;
  due_date:       Date;
  schedule:       ScheduleWire;
}

async function getScheduleRow(userId: string, cardId: string): Promise<typeof cardSchedules.$inferSelect | undefined> {
  const [schedule] = await db
    .select()
    .from(cardSchedules)
    .where(and(eq(cardSchedules.card_id, cardId), eq(cardSchedules.user_id, userId)));
  return schedule;
}

/** A retried review whose client_review_id is already logged: report the current schedule, apply nothing. */
async function getAlreadySubmittedReview(
  userId: string,
  cardId: string,
  clientReviewId: string,
): Promise<SubmittedReview | null> {
  const [log] = await db
    .select({ user_id: reviewLogs.user_id })
    .from(reviewLogs)
    .where(eq(reviewLogs.client_review_id, clientReviewId));
  if (!log) return null;
  if (log.user_id !== userId) throw new ServiceError('FORBIDDEN', 'Access denied');

  const schedule = await getScheduleRow(userId, cardId);
  if (!schedule) throw new ServiceError('NOT_FOUND', 'Schedule not found');
  return {
    scheduled_days: schedule.scheduled_days,
    due_date:       schedule.due_date,
    schedule:       toScheduleWire(schedule),
  };
}

export async function submitReview(
  userId: string,
  cardId: string,
  rating: FsrsRating,
  clientReviewId?: string,
): Promise<SubmittedReview> {
  await assertCardOwnership(userId, cardId);

  if (clientReviewId) {
    const previous = await getAlreadySubmittedReview(userId, cardId, clientReviewId);
    if (previous) return previous;
  }

  try {
    const result = await db.transaction((tx) =>
      applyReview(tx, userId, cardId, rating, undefined, { clientReviewId }),
    );
    return {
      scheduled_days: result.scheduled_days,
      due_date:       result.due_date,
      schedule:       toScheduleWire(result.schedule),
    };
  } catch (error) {
    // Two copies of the same retried request raced: the other one applied it.
    if (clientReviewId && isUniqueViolation(error, CLIENT_REVIEW_ID_CONSTRAINT)) {
      const previous = await getAlreadySubmittedReview(userId, cardId, clientReviewId);
      if (previous) return previous;
    }
    throw error;
  }
}

type ReviewTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ApplyReviewOptions {
  /** When the user actually answered (offline reviews sync later). Defaults to now. */
  reviewedAt?:     Date;
  /** Client id of an offline/retried review, stored for deduplication. */
  clientReviewId?: string;
}

export async function applyReview(
  tx: ReviewTransaction,
  userId: string,
  cardId: string,
  rating: FsrsRating,
  expected?: { reps: number; lastReview: Date | null },
  options: ApplyReviewOptions = {},
): Promise<{ scheduled_days: number; due_date: Date; review_log_id: string; schedule: ReviewResult }> {
  const reviewedAt = options.reviewedAt ?? new Date();
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

  // FSRS 4.5 (Ye et al., 2022): retrievability R = 0.9^(t/S) uses t = the time elapsed between
  // the actual reviews, so a review made offline is scheduled from when it happened
  // (reviewedAt), not from when it reached the server.
  const result = review(schedule, rating, reviewedAt);

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
    reviewed_at: reviewedAt,
    client_review_id: options.clientReviewId ?? null,
  }).returning({ id: reviewLogs.id });

  return {
    scheduled_days: result.scheduled_days,
    due_date: result.due_date,
    review_log_id: log.id,
    schedule: result,
  };
}

// ── Offline sync (POST /api/study/review/sync) ───────────────────────────────

export interface OfflineReviewInput {
  client_review_id: string;
  card_id:          string;
  rating:           FsrsRating;
  reviewed_at:      string; // ISO, bounds checked by SyncOfflineReviewsSchema
}

export interface OfflineSyncResult {
  results:   Array<{ client_review_id: string; status: OfflineReviewStatus }>;
  schedules: Array<{ card_id: string } & ScheduleWire>;
}

async function syncOneOfflineReview(userId: string, item: OfflineReviewInput): Promise<OfflineReviewStatus> {
  const reviewedAt = new Date(item.reviewed_at);
  try {
    return await db.transaction(async (tx) => {
      const [logged] = await tx
        .select({ id: reviewLogs.id })
        .from(reviewLogs)
        .where(eq(reviewLogs.client_review_id, item.client_review_id));

      const [owner] = logged ? [] : await tx
        .select({ user_id: decks.user_id })
        .from(cards)
        .innerJoin(decks, eq(decks.id, cards.deck_id))
        .where(eq(cards.id, item.card_id));
      const cardOwned = owner?.user_id === userId;

      let [schedule] = logged || !cardOwned ? [] : await tx
        .select({ id: cardSchedules.id, last_review: cardSchedules.last_review })
        .from(cardSchedules)
        .where(and(eq(cardSchedules.card_id, item.card_id), eq(cardSchedules.user_id, userId)))
        .for('update');
      if (!logged && cardOwned && !schedule) {
        // Legacy card without a schedule row (the offline snapshot showed it as new): create it.
        [schedule] = await tx
          .insert(cardSchedules)
          .values({ card_id: item.card_id, user_id: userId, state: 'new', due_date: reviewedAt })
          .returning({ id: cardSchedules.id, last_review: cardSchedules.last_review });
      }

      const decision = decideOfflineReview({
        alreadyLogged: Boolean(logged),
        cardOwned,
        lastReview:    schedule?.last_review ?? null,
        reviewedAt,
      });
      if (decision !== 'apply') return decision;

      await applyReview(tx, userId, item.card_id, item.rating, undefined, {
        reviewedAt,
        clientReviewId: item.client_review_id,
      });
      return 'applied';
    });
  } catch (error) {
    // The same client_review_id was applied concurrently (two tabs/devices flushing at once).
    if (isUniqueViolation(error, CLIENT_REVIEW_ID_CONSTRAINT)) return 'duplicate';
    throw error;
  }
}

/**
 * Applies reviews made offline, oldest first, each in its own transaction (a failing item never
 * rolls back the others). Returns one status per item and the current schedule of every card
 * that still exists for the user, so the client can refresh its local snapshot.
 */
export async function syncOfflineReviews(
  userId: string,
  reviews: OfflineReviewInput[],
): Promise<OfflineSyncResult> {
  const results: OfflineSyncResult['results'] = [];
  const touched = new Set<string>();

  for (const item of sortByReviewedAt(reviews)) {
    const status = await syncOneOfflineReview(userId, item);
    results.push({ client_review_id: item.client_review_id, status });
    if (status !== 'not_found') touched.add(item.card_id);
  }

  const schedules = touched.size === 0 ? [] : await db
    .select()
    .from(cardSchedules)
    .where(and(eq(cardSchedules.user_id, userId), inArray(cardSchedules.card_id, [...touched])));

  return {
    results,
    schedules: schedules.map((row) => ({ card_id: row.card_id, ...toScheduleWire(row) })),
  };
}
