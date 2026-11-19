import { expect, test, type Page } from '@playwright/test';

import { openReader, probe } from './reader-probe';

/** Links in a book jump between sections and to anchors (chapter 2 of the fixture carries them). */

async function openChapterTwo(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Contents' }).click();
  await page.getByRole('dialog').getByText('Chapter 2').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.frameLocator('.epub-container iframe').locator('#links')).toBeAttached();
  await page.waitForTimeout(500);
}

function visibleText(page: Page): Promise<string[]> {
  return probe.words(page).then((words) => words.map((word) => word.text));
}

test('links jump to other sections and to anchors', async ({ page }) => {
  await openReader(page);
  const frame = page.frameLocator('.epub-container iframe');

  await openChapterTwo(page);
  await frame.locator('#link-local').click();
  await expect.poll(() => visibleText(page)).toContain('second');

  await openChapterTwo(page);
  await frame.locator('#link-end').click();
  await expect(frame.locator('#ch1-end')).toBeAttached();
  await expect.poll(() => visibleText(page)).toContain('first');

  await openChapterTwo(page);
  await frame.locator('#link-back').click();
  await expect(frame.locator('#links')).toHaveCount(0);
  await expect.poll(() => visibleText(page)).toContain('Early');
});
