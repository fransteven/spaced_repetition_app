import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  decks,
  cards,
  cardSchedules,
  reminderPrograms,
  reminderSchedules,
} from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';
import {
  computeBuckets,
  startOfDayUTC,
  BUCKET_INTERVALS,
  type BucketKey,
} from '@/lib/scheduler';
import { addDays, format } from 'date-fns';

export interface BucketData {
  name: string;
  cards: number;
  intervalDays: number;
  next_date_label: string;
}

export interface ReminderProgramItem {
  id: string;
  name: string;
  deck_id: string;
  deck_name: string;
  active: boolean;
  buckets: BucketData[];
  sessions: Array<{ date: string; cards: number }>;
  created_at: string;
}

function buildSessionPreview(buckets: BucketData[]): Array<{
  date: string;
  cards: number;
}> {
  const occurrences: Array<{ date: Date; cards: number }> = [];
  const now = new Date();

  for (const bucket of buckets) {
    if (bucket.cards === 0) continue;
    for (let i = 0; i < 4; i++) {
      occurrences.push({
        date: addDays(now, i * bucket.intervalDays),
        cards: bucket.cards,
      });
    }
  }

  // Merge by day, keyed on a sortable ISO date so ordering is chronological
  // (formatting to 'MMM d' before sorting would put "Apr 3" before "Feb 1").
  const merged = new Map<string, number>();
  for (const occ of occurrences) {
    const key = format(occ.date, 'yyyy-MM-dd');
    merged.set(key, (merged.get(key) ?? 0) + occ.cards);
  }

  return Array.from(merged.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 4)
    .map(([key, cards]) => ({
      date: format(new Date(`${key}T00:00:00`), 'MMM d'),
      cards,
    }));
}

async function assertProgramOwnership(
  userId: string,
  programId: string
): Promise<void> {
  const [program] = await db
    .select({ user_id: reminderPrograms.user_id })
    .from(reminderPrograms)
    .where(eq(reminderPrograms.id, programId));

  if (!program) {
    throw new ServiceError('NOT_FOUND', 'Program not found');
  }

  if (program.user_id !== userId) {
    throw new ServiceError('FORBIDDEN', 'Access denied');
  }
}

export async function listProgramsForUser(
  userId: string
): Promise<ReminderProgramItem[]> {
  const rows = await db
    .select()
    .from(reminderPrograms)
    .innerJoin(decks, eq(decks.id, reminderPrograms.deck_id))
    .where(eq(reminderPrograms.user_id, userId));

  const result: ReminderProgramItem[] = [];

  for (const row of rows) {
    const schedules = await db
      .select({ stability: cardSchedules.stability })
      .from(cardSchedules)
      .innerJoin(cards, eq(cards.id, cardSchedules.card_id))
      .where(
        and(
          eq(cards.deck_id, row.reminder_programs.deck_id),
          eq(cardSchedules.user_id, userId)
        )
      );

    const rawBuckets = computeBuckets(schedules);
    const now = new Date();
    const bucketList: BucketData[] = Object.values(rawBuckets).map((b) => ({
      name: b.name,
      cards: b.count,
      intervalDays: b.intervalDays,
      next_date_label: format(addDays(now, b.intervalDays), 'MMM d'),
    }));
    const sessions = buildSessionPreview(bucketList);

    result.push({
      id: row.reminder_programs.id,
      name: row.reminder_programs.name,
      deck_id: row.reminder_programs.deck_id,
      deck_name: row.decks.name,
      active: row.reminder_programs.active,
      buckets: bucketList,
      sessions,
      created_at: row.reminder_programs.created_at.toISOString(),
    });
  }

  return result;
}

export async function getBucketPreview(
  userId: string,
  deckId: string
): Promise<BucketData[]> {
  const [deck] = await db
    .select({ user_id: decks.user_id })
    .from(decks)
    .where(eq(decks.id, deckId));

  if (!deck) {
    throw new ServiceError('NOT_FOUND', 'Deck not found');
  }

  if (deck.user_id !== userId) {
    throw new ServiceError('FORBIDDEN', 'Access denied');
  }

  const schedules = await db
    .select({ stability: cardSchedules.stability })
    .from(cardSchedules)
    .innerJoin(cards, eq(cards.id, cardSchedules.card_id))
    .where(
      and(eq(cards.deck_id, deckId), eq(cardSchedules.user_id, userId))
    );

  const rawBuckets = computeBuckets(schedules);
  const now = new Date();
  return Object.values(rawBuckets).map((b) => ({
    name: b.name,
    cards: b.count,
    intervalDays: b.intervalDays,
    next_date_label: format(addDays(now, b.intervalDays), 'MMM d'),
  }));
}

/** Seed one cadence row per bucket, due on the next daily digest run. */
async function seedSchedules(programId: string): Promise<void> {
  const today = startOfDayUTC(new Date());
  const keys = Object.keys(BUCKET_INTERVALS) as BucketKey[];

  await db.insert(reminderSchedules).values(
    keys.map((bucket) => ({
      program_id: programId,
      bucket,
      interval_days: BUCKET_INTERVALS[bucket],
      next_run_at: today,
    }))
  );
}

export async function createProgramForUser(
  userId: string,
  data: {
    name: string;
    deck_id: string;
    enable_email: boolean;
  }
): Promise<ReminderProgramItem> {
  const [deck] = await db
    .select({ user_id: decks.user_id, name: decks.name })
    .from(decks)
    .where(eq(decks.id, data.deck_id));

  if (!deck) {
    throw new ServiceError('NOT_FOUND', 'Deck not found');
  }

  if (deck.user_id !== userId) {
    throw new ServiceError('FORBIDDEN', 'Access denied');
  }

  const schedules = await db
    .select({ stability: cardSchedules.stability })
    .from(cardSchedules)
    .innerJoin(cards, eq(cards.id, cardSchedules.card_id))
    .where(
      and(eq(cards.deck_id, data.deck_id), eq(cardSchedules.user_id, userId))
    );

  const rawBuckets = computeBuckets(schedules);
  const now = new Date();
  const bucketList: BucketData[] = Object.values(rawBuckets).map((b) => ({
    name: b.name,
    cards: b.count,
    intervalDays: b.intervalDays,
    next_date_label: format(addDays(now, b.intervalDays), 'MMM d'),
  }));

  const [program] = await db
    .insert(reminderPrograms)
    .values({
      user_id: userId,
      deck_id: data.deck_id,
      name: data.name,
      active: true,
      enable_email: data.enable_email,
    })
    .returning();

  await seedSchedules(program.id);

  const sessions = buildSessionPreview(bucketList);

  return {
    id: program.id,
    name: program.name,
    deck_id: program.deck_id,
    deck_name: deck.name,
    active: program.active,
    buckets: bucketList,
    sessions,
    created_at: program.created_at.toISOString(),
  };
}

export async function toggleProgramActive(
  userId: string,
  programId: string,
  active: boolean
): Promise<ReminderProgramItem> {
  await assertProgramOwnership(userId, programId);

  await db
    .update(reminderPrograms)
    .set({ active })
    .where(eq(reminderPrograms.id, programId));

  // Resuming restarts the cadence from today so a long pause does not leave
  // next_run_at stuck in the past.
  if (active) {
    await db
      .update(reminderSchedules)
      .set({ next_run_at: startOfDayUTC(new Date()) })
      .where(eq(reminderSchedules.program_id, programId));
  }

  // Fetch updated program
  const updatedRows = await listProgramsForUser(userId);
  const updated = updatedRows.find((p) => p.id === programId);

  if (!updated) {
    throw new ServiceError('NOT_FOUND', 'Program not found after update');
  }

  return updated;
}

export async function deleteProgramForUser(
  userId: string,
  programId: string
): Promise<void> {
  await assertProgramOwnership(userId, programId);

  // reminder_schedules rows cascade with the program.
  await db.delete(reminderPrograms).where(eq(reminderPrograms.id, programId));
}
