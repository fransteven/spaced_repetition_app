export type BucketKey = 'struggling' | 'intermediate' | 'mastered';

// Cepeda et al. (2008) intervals — single source of truth for both the bucket
// preview and the reminder_schedules cadence seeded on program creation.
export const BUCKET_INTERVALS: Record<BucketKey, number> = {
  struggling: 2,
  intermediate: 10,
  mastered: 45,
};

export const BUCKET_LABELS: Record<BucketKey, string> = {
  struggling: 'Struggling',
  intermediate: 'Intermediate',
  mastered: 'Mastered',
};

export interface BucketData {
  name: string;
  count: number;
  intervalDays: number;
}

export interface BucketedSchedule {
  struggling: BucketData;
  intermediate: BucketData;
  mastered: BucketData;
}

export function computeBuckets(
  schedules: Array<{ stability: number }>
): BucketedSchedule {
  const struggling = schedules.filter((s) => s.stability < 10);
  const intermediate = schedules.filter(
    (s) => s.stability >= 10 && s.stability < 50
  );
  const mastered = schedules.filter((s) => s.stability >= 50);

  return {
    struggling: {
      name: BUCKET_LABELS.struggling,
      count: struggling.length,
      intervalDays: BUCKET_INTERVALS.struggling,
    },
    intermediate: {
      name: BUCKET_LABELS.intermediate,
      count: intermediate.length,
      intervalDays: BUCKET_INTERVALS.intermediate,
    },
    mastered: {
      name: BUCKET_LABELS.mastered,
      count: mastered.length,
      intervalDays: BUCKET_INTERVALS.mastered,
    },
  };
}

/**
 * Midnight UTC of the calendar day containing `date` — never the process's
 * local zone. Neon stores `timestamp` without tz, so anchoring day math in UTC
 * keeps results identical on Vercel and on a local dev machine.
 */
export function startOfDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** 'YYYY-MM-DD' for the UTC calendar day of `date`. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
