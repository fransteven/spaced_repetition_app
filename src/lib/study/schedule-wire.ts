import type { CardState, ScheduleInput } from '@/lib/fsrs/types';

/** A card_schedules row as JSON (offline wire contract, docs/plans/offline-mode.md). */
export interface ScheduleWire {
  stability:      number;
  difficulty:     number;
  state:          CardState;
  reps:           number;
  lapses:         number;
  elapsed_days:   number;
  scheduled_days: number;
  due_date:       string;
  last_review:    string | null;
}

export function toScheduleWire(schedule: ScheduleInput): ScheduleWire {
  return {
    stability:      schedule.stability,
    difficulty:     schedule.difficulty,
    state:          schedule.state,
    reps:           schedule.reps,
    lapses:         schedule.lapses,
    elapsed_days:   schedule.elapsed_days,
    scheduled_days: schedule.scheduled_days,
    due_date:       schedule.due_date.toISOString(),
    last_review:    schedule.last_review?.toISOString() ?? null,
  };
}
