import { describe, expect, it } from 'vitest';
import { decideOfflineReview, isUniqueViolation, sortByReviewedAt } from './offline-review-decision';
import { MAX_OFFLINE_REVIEWS_PER_SYNC, SyncOfflineReviewsSchema } from '@/lib/validations';

const AT = new Date('2026-11-20T10:00:00.000Z');

describe('decideOfflineReview', () => {
  it('applies a review newer than the last server review', () => {
    expect(decideOfflineReview({ alreadyLogged: false, cardOwned: true, lastReview: new Date(AT.getTime() - 1), reviewedAt: AT })).toBe('apply');
  });

  it('applies the first review of a never-reviewed card', () => {
    expect(decideOfflineReview({ alreadyLogged: false, cardOwned: true, lastReview: null, reviewedAt: AT })).toBe('apply');
  });

  it('is a duplicate when the client_review_id is already logged, even if the card is gone', () => {
    expect(decideOfflineReview({ alreadyLogged: true, cardOwned: true, lastReview: AT, reviewedAt: AT })).toBe('duplicate');
    expect(decideOfflineReview({ alreadyLogged: true, cardOwned: false, lastReview: null, reviewedAt: AT })).toBe('duplicate');
  });

  it('is not_found when the card is missing or not owned', () => {
    expect(decideOfflineReview({ alreadyLogged: false, cardOwned: false, lastReview: null, reviewedAt: AT })).toBe('not_found');
  });

  it('is stale when another device reviewed at or after reviewed_at', () => {
    expect(decideOfflineReview({ alreadyLogged: false, cardOwned: true, lastReview: AT, reviewedAt: AT })).toBe('stale');
    expect(decideOfflineReview({ alreadyLogged: false, cardOwned: true, lastReview: new Date(AT.getTime() + 60_000), reviewedAt: AT })).toBe('stale');
  });
});

describe('sortByReviewedAt', () => {
  it('sorts oldest first and keeps the client order on ties', () => {
    const items = [
      { id: 'c', reviewed_at: '2026-11-20T10:00:02.000Z' },
      { id: 'a', reviewed_at: '2026-11-20T10:00:00.000Z' },
      { id: 'b1', reviewed_at: '2026-11-20T10:00:01.000Z' },
      { id: 'b2', reviewed_at: '2026-11-20T05:00:01.000-05:00' },
    ];
    expect(sortByReviewedAt(items).map((i) => i.id)).toEqual(['a', 'b1', 'b2', 'c']);
  });
});

describe('isUniqueViolation', () => {
  it('finds a 23505 in the drizzle cause chain and matches the constraint', () => {
    const pg = Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'review_logs_client_review_id_unique' });
    const wrapped = new Error('Failed query', { cause: pg });
    expect(isUniqueViolation(wrapped)).toBe(true);
    expect(isUniqueViolation(wrapped, 'review_logs_client_review_id_unique')).toBe(true);
    expect(isUniqueViolation(wrapped, 'other_constraint')).toBe(false);
    expect(isUniqueViolation(new Error('boom'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe('SyncOfflineReviewsSchema', () => {
  const item = (reviewedAt: Date, id = '11111111-1111-4111-8111-111111111111') => ({
    client_review_id: id,
    card_id: '4a587baa-bd0f-e5ba-ae53-425ce692bad6', // legacy, non-RFC id
    rating: 'good',
    reviewed_at: reviewedAt.toISOString(),
  });

  it('accepts reviews from the last 60 days up to 5 minutes ahead', () => {
    const now = Date.now();
    expect(SyncOfflineReviewsSchema.safeParse({ reviews: [item(new Date(now - 59 * 86_400_000))] }).success).toBe(true);
    expect(SyncOfflineReviewsSchema.safeParse({ reviews: [item(new Date(now + 4 * 60_000))] }).success).toBe(true);
  });

  it('rejects reviews older than 60 days or more than 5 minutes ahead', () => {
    const now = Date.now();
    expect(SyncOfflineReviewsSchema.safeParse({ reviews: [item(new Date(now - 61 * 86_400_000))] }).success).toBe(false);
    expect(SyncOfflineReviewsSchema.safeParse({ reviews: [item(new Date(now + 6 * 60_000))] }).success).toBe(false);
  });

  it('rejects empty batches, batches over the limit and malformed items', () => {
    const now = new Date();
    expect(SyncOfflineReviewsSchema.safeParse({ reviews: [] }).success).toBe(false);
    const many = Array.from({ length: MAX_OFFLINE_REVIEWS_PER_SYNC + 1 }, () => item(now));
    expect(SyncOfflineReviewsSchema.safeParse({ reviews: many }).success).toBe(false);
    expect(SyncOfflineReviewsSchema.safeParse({ reviews: many.slice(1) }).success).toBe(true);
    expect(SyncOfflineReviewsSchema.safeParse({ reviews: [{ ...item(now), rating: 'perfect' }] }).success).toBe(false);
    expect(SyncOfflineReviewsSchema.safeParse({ reviews: [{ ...item(now), reviewed_at: 'yesterday' }] }).success).toBe(false);
    expect(SyncOfflineReviewsSchema.safeParse({ reviews: [item(now, 'not-a-uuid')] }).success).toBe(false);
  });
});
