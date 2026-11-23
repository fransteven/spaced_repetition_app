// ScheduleWire (JSON) <-> FSRS ScheduleInput/ReviewResult (Dates).
import type { ReviewResult, ScheduleInput } from '@/lib/fsrs/types';
import { toScheduleWire, type ScheduleWire } from '@/lib/study/schedule-wire';

export function scheduleFromWire(wire: ScheduleWire): ScheduleInput {
  return {
    ...wire,
    due_date: new Date(wire.due_date),
    last_review: wire.last_review ? new Date(wire.last_review) : null,
  };
}

export function scheduleToWire(result: ReviewResult | ScheduleInput): ScheduleWire {
  return toScheduleWire(result);
}
