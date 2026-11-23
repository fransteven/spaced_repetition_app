/**
 * Per-item decision of POST /api/study/review/sync. Pure, so it is unit-tested without a database;
 * syncOfflineReviews() (study-service.ts) gathers the facts inside the item's transaction.
 */

export type OfflineReviewStatus = 'applied' | 'duplicate' | 'stale' | 'not_found';
export type OfflineReviewDecision = 'apply' | Exclude<OfflineReviewStatus, 'applied'>;

export interface OfflineReviewFacts {
  /** A review_logs row already carries this client_review_id (a retried sync). */
  alreadyLogged: boolean;
  /** The card exists and its deck belongs to the user. */
  cardOwned:     boolean;
  /** card_schedules.last_review on the server, null when never reviewed. */
  lastReview:    Date | null;
  reviewedAt:    Date;
}

export function decideOfflineReview(facts: OfflineReviewFacts): OfflineReviewDecision {
  if (facts.alreadyLogged) return 'duplicate';
  if (!facts.cardOwned) return 'not_found';
  // Another device reviewed the card at or after this offline review: applying it would rewind
  // the schedule. Nothing is written, so card_schedules and review_logs stay consistent.
  if (facts.lastReview && facts.reviewedAt.getTime() <= facts.lastReview.getTime()) return 'stale';
  return 'apply';
}

/** Oldest first; stable, so items with the same timestamp keep the client's order. */
export function sortByReviewedAt<T extends { reviewed_at: string }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index, at: new Date(item.reviewed_at).getTime() }))
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map(({ item }) => item);
}

/** Postgres unique_violation (23505), looked up through drizzle's error `cause` chain. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current instanceof Object; depth++) {
    const code = Reflect.get(current, 'code');
    if (code === '23505') {
      return constraint === undefined || Reflect.get(current, 'constraint') === constraint;
    }
    current = Reflect.get(current, 'cause');
  }
  return false;
}
