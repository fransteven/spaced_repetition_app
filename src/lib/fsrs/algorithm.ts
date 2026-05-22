// FSRS 4.5 — Ye et al. 2022, SIGKDD. Pure functions; no side effects or DB calls.
import { FSRS_WEIGHTS as W } from './constants';
import type { FsrsRating, CardState, ScheduleInput, ReviewResult } from './types';

const RATING_NUM: Record<FsrsRating, number> = { again: 1, hard: 2, good: 3, easy: 4 };

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

// R(t) = 0.9^(t/S) — retrievability after t days with stability S
function retrievability(elapsedDays: number, stability: number): number {
  const s = Math.max(stability, 0.1);
  return Math.pow(0.9, elapsedDays / s);
}

// Initial stability for first review — Ye et al. §4.1
function initStability(ratingNum: number): number {
  return Math.max(W[ratingNum - 1], 0.1);
}

// Initial difficulty — Ye et al. §4.1
function initDifficulty(ratingNum: number): number {
  return clamp(W[4] - Math.exp(W[5] * (ratingNum - 1)) + 1, 1, 10);
}

// Difficulty update with mean reversion toward D₀(4) — Ye et al. §4.3
function nextDifficulty(d: number, ratingNum: number): number {
  const d0_4 = clamp(W[4] - Math.exp(W[5] * 3) + 1, 1, 10);
  const delta = -W[6] * (ratingNum - 3);
  return clamp(W[7] * d0_4 + (1 - W[7]) * (d + delta), 1, 10);
}

// Stability after successful recall — Ye et al. §4.2
function stabilityAfterRecall(d: number, s: number, r: number, ratingNum: number): number {
  const hardPenalty = ratingNum === 2 ? W[15] : 1;
  const easyBonus  = ratingNum === 4 ? W[16] : 1;
  const inc = Math.exp(W[8]) * (11 - d) * Math.pow(Math.max(s, 0.1), -W[9]) * (Math.exp(W[10] * (1 - r)) - 1);
  return Math.max(s * inc * hardPenalty * easyBonus, 0.1);
}

// Stability after a lapse (forgetting) — Ye et al. §4.2
function stabilityAfterLapse(d: number, s: number, r: number): number {
  return Math.max(
    W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)),
    0.1,
  );
}

export function review(schedule: ScheduleInput, rating: FsrsRating, now: Date): ReviewResult {
  const rn = RATING_NUM[rating];

  // First review — treat any reps=0 as a new card regardless of state
  if (schedule.reps === 0) {
    const stability  = initStability(rn);
    const difficulty = initDifficulty(rn);

    let state: CardState;
    let scheduledDays: number;

    if (rating === 'again' || rating === 'hard') {
      state         = 'learning';
      scheduledDays = 0;
    } else if (rating === 'good') {
      state         = 'review';
      scheduledDays = Math.max(1, Math.round(stability));
    } else {
      // easy
      state         = 'review';
      scheduledDays = Math.max(1, Math.round(stability));
    }

    return {
      stability,
      difficulty,
      state,
      reps:           1,
      lapses:         0,
      scheduled_days: scheduledDays,
      elapsed_days:   0,
      due_date:       new Date(now.getTime() + scheduledDays * 86400000),
      last_review:    now,
    };
  }

  // Subsequent review
  const elapsedMs   = schedule.last_review ? now.getTime() - schedule.last_review.getTime() : 0;
  const elapsedDays = Math.max(0, elapsedMs / 86400000);
  const R           = retrievability(elapsedDays, schedule.stability);

  let newStability: number;
  let newState:     CardState;
  let lapseDelta  = 0;

  if (rating === 'again') {
    if (schedule.state === 'review') {
      newStability = stabilityAfterLapse(schedule.difficulty, schedule.stability, R);
      newState     = 'relearning';
      lapseDelta   = 1;
    } else {
      // learning / relearning — reset stability to initial again value
      newStability = initStability(1);
      newState     = schedule.state;
    }
  } else {
    newStability = stabilityAfterRecall(schedule.difficulty, schedule.stability, R, rn);
    newState     = 'review';
  }

  const newDifficulty   = nextDifficulty(schedule.difficulty, rn);
  const scheduledDays   = newState === 'review' ? Math.max(1, Math.round(newStability)) : 0;

  return {
    stability:      newStability,
    difficulty:     newDifficulty,
    state:          newState,
    reps:           schedule.reps + 1,
    lapses:         schedule.lapses + lapseDelta,
    scheduled_days: scheduledDays,
    elapsed_days:   Math.round(elapsedDays),
    due_date:       new Date(now.getTime() + scheduledDays * 86400000),
    last_review:    now,
  };
}

// Run review() for all 4 ratings and return the resulting scheduled_days.
// Used to show predicted intervals on rating buttons (Anki-style preview).
export function previewIntervals(schedule: ScheduleInput, now: Date): Record<FsrsRating, number> {
  const ratings: FsrsRating[] = ['again', 'hard', 'good', 'easy'];
  return Object.fromEntries(
    ratings.map(r => [r, review(schedule, r, now).scheduled_days]),
  ) as Record<FsrsRating, number>;
}
