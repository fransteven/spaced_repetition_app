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
    struggling: { name: 'Struggling', count: struggling.length, intervalDays: 2 },
    intermediate: {
      name: 'Intermediate',
      count: intermediate.length,
      intervalDays: 10,
    },
    mastered: { name: 'Mastered', count: mastered.length, intervalDays: 45 },
  };
}

export interface CalendarEventPayload {
  summary: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  recurrence: string[];
}

export function buildCalendarEvents(
  deckName: string,
  buckets: BucketedSchedule,
  startDate: Date,
  timeZone: string
): CalendarEventPayload[] {
  const events: CalendarEventPayload[] = [];

  // Set start time to 9:00 AM local time on the given date
  const baseStart = new Date(startDate);
  baseStart.setHours(9, 0, 0, 0);

  Object.values(buckets).forEach((bucket) => {
    if (bucket.count === 0) return;

    const end = new Date(baseStart);
    end.setMinutes(end.getMinutes() + 30);

    events.push({
      summary: `SRS: ${deckName} — ${bucket.name} (${bucket.count} cards)`,
      start: {
        dateTime: baseStart.toISOString(),
        timeZone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone,
      },
      recurrence: [`RRULE:FREQ=DAILY;INTERVAL=${bucket.intervalDays}`],
    });
  });

  return events;
}
