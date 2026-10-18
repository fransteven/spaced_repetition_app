import { expect, test } from '@playwright/test';
import { z } from 'zod';

const CreatedResource = z.object({ data: z.object({ id: z.string() }) });

test('deck text size persists across the library, cards, and study', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'one browser for the responsive matrix');
  test.setTimeout(180_000);
  await page.goto('/decks');
  const name = `Typography ${Date.now()}`;
  const response = await page.request.post('/api/decks', {
    data: { name, description: 'A readable deck description', subject: 'custom' },
  });
  expect(response.ok()).toBe(true);
  const { data: deck } = CreatedResource.parse(await response.json());

  try {
    const cardResponse = await page.request.post('/api/cards', {
      data: { deck_id: deck.id, front: 'A legible question', back: 'A legible answer' },
    });
    expect(cardResponse.ok()).toBe(true);
    await page.reload();
    await page.getByPlaceholder('Filter decks…').fill(name);
    const description = page.getByRole('main').getByText('A readable deck description', { exact: true });
    await expect(description).toHaveCSS('font-size', '18px');
    await page.getByRole('combobox', { name: 'Deck text size' }).click();
    await page.getByRole('option', { name: 'Extra large · 24', exact: true }).click();
    await expect(description).toHaveCSS('font-size', '24px');
    await page.reload();
    await expect(description).toHaveCSS('font-size', '24px');

    await page.goto(`/decks/${deck.id}`);
    const front = page.getByText('A legible question', { exact: true });
    const back = page.getByText('A legible answer', { exact: true });
    await expect(front).toHaveCSS('font-size', '24px');
    await expect(back).toHaveCSS('font-size', '24px');
    for (const width of [360, 414, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.getByRole('combobox', { name: 'Deck text size' })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`deck-${width}.png`), fullPage: true });
    }

    await page.goto(`/study/${deck.id}`);
    await expect(page.getByText('A legible question', { exact: true })).toHaveCSS('font-size', '24px');
    const textSize = page.getByRole('combobox', { name: 'Deck text size' });
    await textSize.focus();
    await textSize.press('Enter');
    await page.getByRole('option', { name: 'Extra large · 24', exact: true }).click();
    await expect(page.getByRole('button', { name: /Show answer/ })).toBeVisible();
    await page.getByRole('button', { name: /Show answer/ }).click();
    await expect(page.getByText('A legible answer', { exact: true })).toHaveCSS('font-size', '24px');
    await page.getByRole('combobox', { name: 'Deck text size' }).click();
    await page.getByRole('option', { name: 'Large · 20', exact: true }).click();
    await expect(page.getByText('A legible answer', { exact: true })).toHaveCSS('font-size', '20px');

    await page.goto('/decks');
    await page.getByRole('button', { name: 'Open quick search', exact: true }).click();
    const search = page.getByRole('combobox', { name: 'Search decks, study sessions, and pages' });
    await search.fill(name);
    const before = await search.getAttribute('aria-activedescendant');
    await search.press('ArrowDown');
    await expect(search).not.toHaveAttribute('aria-activedescendant', before ?? '');
    const selected = page.getByRole('option', { selected: true });
    await expect(selected).toHaveAttribute('id', await search.getAttribute('aria-activedescendant') ?? '');
  } finally {
    const deleted = await page.request.delete(`/api/decks/${deck.id}`);
    expect(deleted.ok()).toBe(true);
  }
});
