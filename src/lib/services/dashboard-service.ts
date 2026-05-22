import { and, eq, gte, gt, sql } from 'drizzle-orm';
import { differenceInCalendarDays, formatDistanceToNowStrict, startOfDay, subDays } from 'date-fns';
import { db } from '@/lib/db';
import { cards, cardSchedules, decks, reviewLogs } from '@/lib/db/schema';
import { listDecksForUser } from '@/lib/services/deck-service';
import type { TimelineItem } from '@/components/dashboard/timeline-list';

export interface DashboardDeckData {
  id: string;
  name: string;
  subject: string;
  total_cards: number;
  due_count: number;
  mastery: number;
}

export interface DashboardStats {
  dueToday: number;
  dueDeckCount: number;
  masteredTotal: number;
  streakDays: number;
}

export interface DashboardData {
  stats: DashboardStats;
  decks: DashboardDeckData[];
  heatmap: number[];
  timeline: TimelineItem[];
}

const OPACITY_THRESHOLDS = [
  { min: 15, value: 90 },
  { min: 10, value: 60 },
  { min:  7, value: 40 },
  { min:  4, value: 30 },
  { min:  2, value: 20 },
  { min:  1, value: 10 },
] as const;

function countToOpacity(count: number): number {
  if (count === 0) return 0;
  for (const t of OPACITY_THRESHOLDS) {
    if (count >= t.min) return t.value;
  }
  return 10;
}

function stabilityBucket(stability: number): { label: string; meta: string; dotColor: string; labelColor: string } {
  if (stability < 10)  return { label: 'Struggling',    meta: 'Struggling · Re-evaluation', dotColor: 'bg-error',    labelColor: 'text-error' };
  if (stability < 50)  return { label: 'Intermediate',  meta: 'Intermediate · Spaced Interval', dotColor: 'bg-primary',  labelColor: 'text-primary' };
  return                      { label: 'Mastered',      meta: 'Mastered · Maintenance',     dotColor: 'bg-tertiary', labelColor: 'text-tertiary' };
}

function relativeLabel(date: Date, now: Date): string {
  const diff = differenceInCalendarDays(date, now);
  if (diff <= 0)  return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 6)  return `In ${diff} days`;
  if (diff <= 13) return 'Next week';
  return formatDistanceToNowStrict(date, { addSuffix: false });
}

async function getStreakDays(userId: string, now: Date): Promise<number> {
  const rows = await db
    .selectDistinct({ d: sql<string>`date(${reviewLogs.reviewed_at})` })
    .from(reviewLogs)
    .where(eq(reviewLogs.user_id, userId))
    .orderBy(sql`date(${reviewLogs.reviewed_at}) desc`);

  if (rows.length === 0) return 0;

  // Allow streak to still count if user hasn't studied yet today
  const anchor = startOfDay(now);
  let streak = 0;
  let cursor = anchor;

  for (const row of rows) {
    const rowDate = startOfDay(new Date(row.d));
    const diff = differenceInCalendarDays(cursor, rowDate);
    if (diff > 1) break; // gap — streak ends
    streak++;
    cursor = rowDate;
  }

  return streak;
}

async function getHeatmap(userId: string, now: Date): Promise<number[]> {
  const since = subDays(now, 69); // 70 days including today

  const rows = await db
    .select({
      d:     sql<string>`date(${reviewLogs.reviewed_at})`,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(reviewLogs)
    .where(
      and(
        eq(reviewLogs.user_id, userId),
        gte(reviewLogs.reviewed_at, startOfDay(since)),
      )
    )
    .groupBy(sql`date(${reviewLogs.reviewed_at})`);

  const countByDay = new Map<string, number>();
  for (const r of rows) {
    countByDay.set(r.d, r.count);
  }

  return Array.from({ length: 70 }, (_, i) => {
    const day = subDays(now, 69 - i);
    const key = day.toISOString().slice(0, 10);
    return countToOpacity(countByDay.get(key) ?? 0);
  });
}

async function getTimeline(userId: string, now: Date): Promise<TimelineItem[]> {
  const rows = await db
    .select({
      deck_name:  decks.name,
      deck_id:    decks.id,
      due_date:   cardSchedules.due_date,
      stability:  cardSchedules.stability,
    })
    .from(cardSchedules)
    .innerJoin(cards, eq(cards.id, cardSchedules.card_id))
    .innerJoin(decks, eq(decks.id, cards.deck_id))
    .where(
      and(
        eq(cardSchedules.user_id, userId),
        gt(cardSchedules.due_date, now),
      )
    )
    .orderBy(cardSchedules.due_date);

  // Group by deck_id + bucket key
  const groups = new Map<string, { deck: string; count: number; earliest: Date; bucket: ReturnType<typeof stabilityBucket> }>();

  for (const r of rows) {
    const bucket = stabilityBucket(r.stability);
    const key = `${r.deck_id}::${bucket.label}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(key, { deck: r.deck_name, count: 1, earliest: r.due_date, bucket });
    }
  }

  // Sort by earliest due date, take top 5
  const sorted = [...groups.values()].sort((a, b) => a.earliest.getTime() - b.earliest.getTime());

  return sorted.slice(0, 5).map(g => ({
    label:      relativeLabel(g.earliest, now),
    deck:       g.deck,
    cards:      g.count,
    meta:       g.bucket.meta,
    dotColor:   g.bucket.dotColor,
    labelColor: g.bucket.labelColor,
  }));
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();

  const [deckList, streakDays, heatmap, timeline] = await Promise.all([
    listDecksForUser(userId),
    getStreakDays(userId, now),
    getHeatmap(userId, now),
    getTimeline(userId, now),
  ]);

  const dueToday    = deckList.reduce((s, d) => s + d.due_count, 0);
  const dueDeckCount = deckList.filter(d => d.due_count > 0).length;
  const masteredTotal = deckList.reduce((s, d) => s + d.mastered_count, 0);

  const mappedDecks: DashboardDeckData[] = deckList.map(d => ({
    id:          d.id,
    name:        d.name,
    subject:     d.subject,
    total_cards: d.total_cards,
    due_count:   d.due_count,
    mastery:     d.total_cards > 0 ? Math.round((d.mastered_count / d.total_cards) * 100) : 0,
  }));

  return {
    stats: { dueToday, dueDeckCount, masteredTotal, streakDays },
    decks: mappedDecks,
    heatmap,
    timeline,
  };
}
