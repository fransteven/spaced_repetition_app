import { expect, test, type Page } from '@playwright/test';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';

import * as schema from '../src/lib/db/schema';
import { BOOK_ID, assertTestDatabase } from './env';
import { fixtureEpub } from './fixtures/epub';

/**
 * Offline mode (docs/plans/offline-mode.md): download a book and a deck, cut the network, use them
 * through the service worker's offline shells, then reconnect and check the outbox synced exactly once.
 * Chromium only: Playwright's WebKit has no service worker support worth testing here.
 */

const db = drizzle(neon(assertTestDatabase()), { schema });
const CreatedResource = z.object({ data: z.object({ id: z.string() }) });

test.use({ serviceWorkers: 'allow' });
test.skip(({ browserName }) => browserName !== 'chromium', 'service workers: Chromium only');

/** Waits until the service worker is active and controls the page (shells precached). */
async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => navigator.serviceWorker.controller !== null))) {
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  }
}

async function goOffline(page: Page): Promise<void> {
  await page.context().setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
}

async function goOnline(page: Page): Promise<void> {
  await page.context().setOffline(false);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(true);
}

test('a downloaded book opens offline and its bookmark syncs on reconnect', async ({ page }) => {
  test.setTimeout(180_000);
  await db.delete(schema.bookBookmarks).where(eq(schema.bookBookmarks.book_id, BOOK_ID));

  const epub = await fixtureEpub();
  await page.route(`**/api/books/${BOOK_ID}/file`, (route) =>
    route.fulfill({ body: epub, contentType: 'application/epub+zip' })
  );

  await page.goto('/library');
  await waitForServiceWorker(page);

  await page.getByRole('button', { name: 'Options for E2E Fixture Book' }).click();
  await page.getByRole('menuitem', { name: /Download for offline/ }).click();
  await expect(page.getByText('Offline', { exact: true }).first()).toBeVisible({ timeout: 60_000 });

  await goOffline(page);
  await page.goto(`/read/${BOOK_ID}`);
  await expect(page).toHaveURL(new RegExp(`/offline/read\\?book=${BOOK_ID}`));
  await expect(page.getByTestId('page-label')).toHaveText(/\d/, { timeout: 60_000 });

  await page.getByRole('button', { name: 'Bookmark this page' }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();

  const offlineRows = await db.select().from(schema.bookBookmarks).where(eq(schema.bookBookmarks.book_id, BOOK_ID));
  expect(offlineRows).toHaveLength(0);

  await goOnline(page);
  await expect
    .poll(
      async () =>
        (await db.select().from(schema.bookBookmarks).where(eq(schema.bookBookmarks.book_id, BOOK_ID))).length,
      { timeout: 60_000 }
    )
    .toBe(1);
});

test('a downloaded deck is studied offline and every review syncs exactly once', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/decks');
  const deckName = `Offline deck ${Date.now()}`;
  const deckResponse = await page.request.post('/api/decks', { data: { name: deckName, subject: 'custom' } });
  expect(deckResponse.ok()).toBe(true);
  const { data: deck } = CreatedResource.parse(await deckResponse.json());

  try {
    const cardIds: string[] = [];
    for (const n of [1, 2, 3]) {
      const res = await page.request.post('/api/cards', {
        data: { deck_id: deck.id, front: `Offline question ${n}`, back: `Offline answer ${n}` },
      });
      expect(res.ok()).toBe(true);
      cardIds.push(CreatedResource.parse(await res.json()).data.id);
    }

    await page.reload();
    await waitForServiceWorker(page);

    const deckCard = page
      .getByText(deckName, { exact: true })
      .locator('xpath=ancestor::*[.//button[@aria-label="Deck actions"]][1]');
    await deckCard.getByRole('button', { name: 'Deck actions' }).click();
    await page.getByRole('menuitem', { name: /Download deck/ }).click();
    await expect(deckCard.getByText('Offline', { exact: true })).toBeVisible({ timeout: 60_000 });

    await goOffline(page);
    await page.goto(`/study/${deck.id}`);
    await expect(page).toHaveURL(new RegExp(`/offline/study\\?deck=${deck.id}`));

    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: /Show answer/ }).click();
      await page.getByRole('button', { name: /Good/ }).click();
    }
    await expect(page.getByText('Your streak will update when you sync')).toBeVisible();

    const syncedLogs = async (): Promise<number> =>
      (
        await db
          .select({ id: schema.reviewLogs.id })
          .from(schema.reviewLogs)
          .where(and(inArray(schema.reviewLogs.card_id, cardIds), isNotNull(schema.reviewLogs.client_review_id)))
      ).length;
    expect(await syncedLogs()).toBe(0);

    await goOnline(page);
    await expect.poll(syncedLogs, { timeout: 60_000 }).toBe(3);

    // A second flush (fresh load) must not replay anything.
    await page.goto('/decks');
    await page.waitForTimeout(3_000);
    expect(await syncedLogs()).toBe(3);
  } finally {
    await page.context().setOffline(false);
    await page.request.delete(`/api/decks/${deck.id}`);
  }
});
