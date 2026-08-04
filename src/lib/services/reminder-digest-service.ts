import { eq, and, lte, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  cards,
  cardSchedules,
  decks,
  reminderDeliveries,
  reminderPrograms,
  reminderSchedules,
  users,
} from '@/lib/db/schema';
import {
  addDaysUTC,
  computeBuckets,
  startOfDayUTC,
  toDateKey,
  BUCKET_LABELS,
  type BucketKey,
} from '@/lib/scheduler';
import { sendEmail } from '@/lib/email/send';
import {
  renderStudyDigestEmail,
  type DigestItem,
} from '@/lib/email/templates/study-digest';

export type DigestStatus = 'sent' | 'failed' | 'empty' | 'skipped_duplicate';

export interface DigestResult {
  user_id: string;
  status: DigestStatus;
  itemCount: number;
  error?: string;
}

interface DueRow {
  schedule_id: string;
  bucket: string;
  interval_days: number;
  deck_id: string;
  deck_name: string;
  program_name: string;
  user_id: string;
}

function isBucketKey(value: string): value is BucketKey {
  return value === 'struggling' || value === 'intermediate' || value === 'mastered';
}

/**
 * Schedule rows for active email programs. `ignoreDueDate` is used by the
 * manual "send now" path so the button still works between cadence ticks.
 */
async function selectDueRows(
  refDate: Date,
  options: { userId?: string; ignoreDueDate?: boolean } = {}
): Promise<DueRow[]> {
  const conditions = [
    eq(reminderPrograms.active, true),
    eq(reminderPrograms.enable_email, true),
  ];

  if (!options.ignoreDueDate) {
    conditions.push(lte(reminderSchedules.next_run_at, refDate));
  }

  if (options.userId) {
    conditions.push(eq(reminderPrograms.user_id, options.userId));
  }

  return db
    .select({
      schedule_id: reminderSchedules.id,
      bucket: reminderSchedules.bucket,
      interval_days: reminderSchedules.interval_days,
      deck_id: reminderPrograms.deck_id,
      deck_name: decks.name,
      program_name: reminderPrograms.name,
      user_id: reminderPrograms.user_id,
    })
    .from(reminderSchedules)
    .innerJoin(
      reminderPrograms,
      eq(reminderPrograms.id, reminderSchedules.program_id)
    )
    .innerJoin(decks, eq(decks.id, reminderPrograms.deck_id))
    .where(and(...conditions));
}

/**
 * Advance the cadence anchored to *today*, not to the stale next_run_at, so a
 * cron that missed a few days does not fire a catch-up burst.
 */
async function advanceSchedules(
  rows: DueRow[],
  refDate: Date
): Promise<void> {
  const today = startOfDayUTC(refDate);
  const byInterval = new Map<number, string[]>();

  for (const row of rows) {
    const ids = byInterval.get(row.interval_days) ?? [];
    ids.push(row.schedule_id);
    byInterval.set(row.interval_days, ids);
  }

  for (const [intervalDays, ids] of byInterval) {
    await db
      .update(reminderSchedules)
      .set({ next_run_at: addDaysUTC(today, intervalDays) })
      .where(inArray(reminderSchedules.id, ids));
  }
}

/** Live card count for one bucket of one deck, recomputed from FSRS stability. */
async function countBucketCards(
  userId: string,
  deckId: string,
  bucket: BucketKey
): Promise<number> {
  const schedules = await db
    .select({ stability: cardSchedules.stability })
    .from(cardSchedules)
    .innerJoin(cards, eq(cards.id, cardSchedules.card_id))
    .where(and(eq(cards.deck_id, deckId), eq(cardSchedules.user_id, userId)));

  return computeBuckets(schedules)[bucket].count;
}

async function buildItems(rows: DueRow[]): Promise<DigestItem[]> {
  const items: DigestItem[] = [];

  for (const row of rows) {
    if (!isBucketKey(row.bucket)) continue;

    const count = await countBucketCards(row.user_id, row.deck_id, row.bucket);
    // Empty buckets are skipped in the email but their cadence still advances.
    if (count === 0) continue;

    items.push({
      deck_id: row.deck_id,
      deck_name: row.deck_name,
      program_name: row.program_name,
      bucket: BUCKET_LABELS[row.bucket],
      cards: count,
    });
  }

  return items;
}

/** Send (and log) one digest for a single user from already-selected rows. */
async function deliverForUser(
  userId: string,
  rows: DueRow[],
  refDate: Date,
  force: boolean
): Promise<DigestResult> {
  const dateKey = toDateKey(startOfDayUTC(refDate));
  const dedupeKey = force
    ? `digest:${userId}:${dateKey}:manual:${Date.now()}`
    : `digest:${userId}:${dateKey}`;

  if (!force) {
    const [existing] = await db
      .select({ id: reminderDeliveries.id })
      .from(reminderDeliveries)
      .where(eq(reminderDeliveries.dedupe_key, dedupeKey))
      .limit(1);

    if (existing) {
      return { user_id: userId, status: 'skipped_duplicate', itemCount: 0 };
    }
  }

  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.email) {
    return { user_id: userId, status: 'failed', itemCount: 0, error: 'User email not found' };
  }

  const items = await buildItems(rows);

  if (items.length === 0) {
    await db.insert(reminderDeliveries).values({
      user_id: userId,
      digest_date: dateKey,
      sent_to: user.email,
      item_count: 0,
      dedupe_key: dedupeKey,
      status: 'empty',
    });
    if (!force) await advanceSchedules(rows, refDate);
    return { user_id: userId, status: 'empty', itemCount: 0 };
  }

  const html = renderStudyDigestEmail(user.name, items, refDate);
  const totalCards = items.reduce((sum, i) => sum + i.cards, 0);
  const result = await sendEmail({
    to: user.email,
    subject: `Today's review: ${totalCards} cards due`,
    html,
  });

  await db.insert(reminderDeliveries).values({
    user_id: userId,
    digest_date: dateKey,
    sent_to: user.email,
    item_count: items.length,
    dedupe_key: dedupeKey,
    status: result.ok ? 'sent' : 'failed',
    error: result.error ?? null,
  });

  // Advance even on SMTP failure: retrying tomorrow beats hammering a broken
  // mailbox every cron tick with the same due rows. A manual send never
  // disturbs the cadence.
  if (!force) await advanceSchedules(rows, refDate);

  return {
    user_id: userId,
    status: result.ok ? 'sent' : 'failed',
    itemCount: items.length,
    error: result.error,
  };
}

/** Cron entrypoint: one digest per user with due buckets. */
export async function sendDueDigests(refDate: Date): Promise<DigestResult[]> {
  const rows = await selectDueRows(refDate);

  const byUser = new Map<string, DueRow[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const results: DigestResult[] = [];
  for (const [userId, userRows] of byUser) {
    results.push(await deliverForUser(userId, userRows, refDate, false));
  }

  return results;
}

/** Manual "send now" entrypoint, scoped to one user. */
export async function sendDigestForUser(
  userId: string,
  refDate: Date,
  options: { force?: boolean } = {}
): Promise<DigestResult> {
  const force = options.force ?? false;
  const rows = await selectDueRows(refDate, { userId, ignoreDueDate: force });

  if (rows.length === 0) {
    return { user_id: userId, status: 'empty', itemCount: 0 };
  }

  return deliverForUser(userId, rows, refDate, force);
}
