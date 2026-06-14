import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  decks,
  cards,
  cardSchedules,
  reminderPrograms,
  users,
} from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';
import { computeBuckets, buildCalendarEvents } from '@/lib/scheduler';
import {
  createBucketEvents,
  deleteBucketEvents,
} from '@/lib/services/google-calendar-service';
import { sendReminderCreatedEmail } from '@/lib/services/gmail-service';
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

  // Merge by date
  const merged = new Map<string, number>();
  for (const occ of occurrences) {
    const key = format(occ.date, 'MMM d');
    merged.set(key, (merged.get(key) ?? 0) + occ.cards);
  }

  return Array.from(merged.entries())
    .map(([date, cards]) => ({ date, cards }))
    .sort((a, b) => {
      // Sort by parsing the date string back — this is a preview so approximate ordering is fine
      return a.date.localeCompare(b.date);
    })
    .slice(0, 4);
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

export async function createProgramForUser(
  userId: string,
  data: {
    name: string;
    deck_id: string;
    enable_gcal: boolean;
    enable_gmail: boolean;
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

  const [user] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId));

  const timeZone = user?.timezone ?? 'America/Bogota';

  let eventIds: string[] = [];

  if (data.enable_gcal) {
    const events = buildCalendarEvents(deck.name, rawBuckets, new Date(), timeZone);
    if (events.length > 0) {
      eventIds = await createBucketEvents(userId, events);
    }
  }

  if (data.enable_gmail && bucketList.some((b) => b.cards > 0)) {
    try {
      await sendReminderCreatedEmail(userId, deck.name, bucketList);
    } catch {
      // Non-fatal: email failure should not block program creation
    }
  }

  const [program] = await db
    .insert(reminderPrograms)
    .values({
      user_id: userId,
      deck_id: data.deck_id,
      name: data.name,
      active: true,
      calendar_event_ids: eventIds,
    })
    .returning();

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

  const [program] = await db
    .select()
    .from(reminderPrograms)
    .where(eq(reminderPrograms.id, programId));

  const storedEventIds = Array.isArray(program.calendar_event_ids)
    ? (program.calendar_event_ids as string[])
    : [];

  if (!active && storedEventIds.length > 0) {
    try {
      await deleteBucketEvents(userId, storedEventIds);
    } catch {
      // Non-fatal: events may already be deleted
    }

    await db
      .update(reminderPrograms)
      .set({ active: false, calendar_event_ids: [] })
      .where(eq(reminderPrograms.id, programId));
  } else if (active) {
    // Reactivate: recompute buckets and create new events
    const [deck] = await db
      .select({ name: decks.name })
      .from(decks)
      .where(eq(decks.id, program.deck_id));

    const schedules = await db
      .select({ stability: cardSchedules.stability })
      .from(cardSchedules)
      .innerJoin(cards, eq(cards.id, cardSchedules.card_id))
      .where(
        and(
          eq(cards.deck_id, program.deck_id),
          eq(cardSchedules.user_id, userId)
        )
      );

    const rawBuckets = computeBuckets(schedules);

    const [user] = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId));

    const timeZone = user?.timezone ?? 'America/Bogota';

    const events = buildCalendarEvents(
      deck.name,
      rawBuckets,
      new Date(),
      timeZone
    );

    let newEventIds: string[] = [];
    if (events.length > 0) {
      newEventIds = await createBucketEvents(userId, events);
    }

    await db
      .update(reminderPrograms)
      .set({ active: true, calendar_event_ids: newEventIds })
      .where(eq(reminderPrograms.id, programId));
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

  const [program] = await db
    .select()
    .from(reminderPrograms)
    .where(eq(reminderPrograms.id, programId));

  const storedEventIds = Array.isArray(program.calendar_event_ids)
    ? (program.calendar_event_ids as string[])
    : [];

  if (storedEventIds.length > 0) {
    try {
      await deleteBucketEvents(userId, storedEventIds);
    } catch {
      // Non-fatal: events may already be deleted
    }
  }

  await db.delete(reminderPrograms).where(eq(reminderPrograms.id, programId));
}
