export type FsrsRating = 'again' | 'hard' | 'good' | 'easy';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface ScheduleInput {
  stability: number;
  difficulty: number;
  state: CardState;
  reps: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  due_date: Date;
  last_review: Date | null;
}

export interface ReviewResult {
  stability: number;
  difficulty: number;
  state: CardState;
  reps: number;
  lapses: number;
  scheduled_days: number;
  elapsed_days: number;
  due_date: Date;
  last_review: Date;
}
