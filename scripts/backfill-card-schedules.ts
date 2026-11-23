/**
 * One-off repair: gives every card without a `card_schedules` row a fresh "new" schedule for
 * the deck owner. Such cards (written straight to the database, outside card-service) never
 * show up in a study session because the session inner-joins schedules.
 *
 * Dry run (default):  npx tsx --env-file=.env scripts/backfill-card-schedules.ts
 * Write:              npx tsx --env-file=.env scripts/backfill-card-schedules.ts --apply
 */
import { eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import { cards, cardSchedules, decks } from '@/lib/db/schema';

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  const orphans = await db
    .select({ card_id: cards.id, user_id: decks.user_id, deck: decks.name })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deck_id))
    .leftJoin(cardSchedules, eq(cardSchedules.card_id, cards.id))
    .where(isNull(cardSchedules.id));

  const perDeck = new Map<string, number>();
  for (const row of orphans) perDeck.set(row.deck, (perDeck.get(row.deck) ?? 0) + 1);
  console.log(`${orphans.length} card(s) without a schedule`, Object.fromEntries(perDeck));

  if (!apply || orphans.length === 0) {
    if (!apply) console.log('Dry run. Re-run with --apply to write.');
    return;
  }

  const now = new Date();
  const inserted = await db
    .insert(cardSchedules)
    .values(orphans.map((row) => ({ card_id: row.card_id, user_id: row.user_id, state: 'new' as const, due_date: now })))
    .returning({ id: cardSchedules.id });
  console.log(`Inserted ${inserted.length} schedule(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[backfill-card-schedules]', error);
    process.exit(1);
  });
