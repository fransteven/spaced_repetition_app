/**
 * Learning State & FSRS Bucket Tokens — DESIGN.md §2 and AGENTS.md §7.1
 * Single source of truth for mapping learning state buckets to tokens.
 */

export type LearningStateBucket = 'new' | 'struggling' | 'intermediate' | 'mastered';

export interface LearningStateMeta {
  bucket: LearningStateBucket;
  label: string;
  meta: string;
  dotClass: string;
  textClass: string;
  containerClass: string;
}

export function getStabilityBucket(stability: number): LearningStateBucket {
  if (stability < 10) return 'struggling';
  if (stability < 50) return 'intermediate';
  return 'mastered';
}

export const LEARNING_STATES: Record<LearningStateBucket, LearningStateMeta> = {
  new: {
    bucket: 'new',
    label: 'New',
    meta: 'New · Initial Learning',
    dotClass: 'bg-state-new',
    textClass: 'text-state-new',
    containerClass: 'bg-state-new-container text-on-state-new-container',
  },
  struggling: {
    bucket: 'struggling',
    label: 'Struggling',
    meta: 'Struggling · Re-evaluation',
    dotClass: 'bg-state-struggling',
    textClass: 'text-state-struggling',
    containerClass: 'bg-state-struggling-container text-on-state-struggling-container',
  },
  intermediate: {
    bucket: 'intermediate',
    label: 'Intermediate',
    meta: 'Intermediate · Spaced Interval',
    dotClass: 'bg-state-intermediate',
    textClass: 'text-state-intermediate',
    containerClass: 'bg-state-intermediate-container text-on-state-intermediate-container',
  },
  mastered: {
    bucket: 'mastered',
    label: 'Mastered',
    meta: 'Mastered · Maintenance',
    dotClass: 'bg-state-mastered',
    textClass: 'text-state-mastered',
    containerClass: 'bg-state-mastered-container text-on-state-mastered-container',
  },
};

export function getLearningState(bucket: LearningStateBucket): LearningStateMeta {
  return LEARNING_STATES[bucket] ?? LEARNING_STATES.new;
}
