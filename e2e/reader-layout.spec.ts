import { expect, test, type Page } from '@playwright/test';

import { openReader, probe } from './reader-probe';

/**
 * Reader layout: the top bar never covers the text, "Ask this book" docks beside the page (below it on
 * phones) without blurring the book, and a translation never looks like book text.
 */

const isPhone = (page: Page): boolean => (page.viewportSize()?.width ?? 0) < 768;

const pageBox = (page: Page): Promise<{ top: number; bottom: number; width: number }> =>
  page.evaluate(() => {
    const rect = document.querySelector('.epub-container')?.getBoundingClientRect();
    return { top: rect?.top ?? -1, bottom: rect?.bottom ?? -1, width: rect?.width ?? -1 };
  });

test.beforeEach(async ({ page }) => {
  await openReader(page);
});

test('the top bar sits above the page and never covers the text', async ({ page }) => {
  const header = await page.locator('header').boundingBox();
  const words = await probe.words(page);
  const firstLine = Math.min(...words.map((word) => word.y));
  expect(header!.y + header!.height).toBeLessThanOrEqual((await pageBox(page)).top + 1);
  expect(header!.y + header!.height).toBeLessThanOrEqual(firstLine);
});

test('Ask this book docks beside (or below) the page: the book stays sharp and readable', async ({ page }) => {
  const before = await pageBox(page);
  const label = await page.getByTestId('page-label').textContent();

  await page.getByRole('button', { name: 'Ask this book' }).click();
  const panel = page.getByTestId('ask-panel');
  await expect(panel).toBeVisible();
  expect(await probe.blurred(page)).toEqual([]);

  const box = (await panel.boundingBox())!;
  if (isPhone(page)) {
    // Bottom half: the book keeps the top half.
    await expect.poll(async () => (await pageBox(page)).bottom).toBeLessThanOrEqual(box.y + 1);
    expect(box.y).toBeGreaterThan(page.viewportSize()!.height * 0.35);
  } else {
    // Beside the page: the book re-paginates narrower, on the same page.
    await expect.poll(async () => (await pageBox(page)).width).toBeLessThan(before.width - 100);
    expect(box.x).toBeGreaterThanOrEqual((await page.locator('.epub-container').boundingBox())!.x + (await pageBox(page)).width - 1);
  }
  // The book is laid out again for its new size: the page (iframe) never runs past what is visible.
  const overflow = (): Promise<number> =>
    page.evaluate(() => {
      const scroller = document.querySelector('.epub-container')?.getBoundingClientRect();
      const frame = document.querySelector('.epub-container iframe')?.getBoundingClientRect();
      return scroller && frame ? frame.bottom - scroller.bottom : Number.POSITIVE_INFINITY;
    });
  await expect.poll(overflow).toBeLessThanOrEqual(1);
  // …and narrower: one text column fits the visible width (no line runs under the panel).
  const columnOverflow = (): Promise<number> =>
    page.evaluate(() => {
      const box = document.querySelector('.epub-container')?.getBoundingClientRect();
      const frame = document.querySelector<HTMLIFrameElement>('.epub-container iframe');
      const doc = frame?.contentDocument;
      if (!box || !frame || !doc) return Number.POSITIVE_INFINITY;
      const left = frame.getBoundingClientRect().left;
      // Lines that start on the visible page must also end on it.
      let worst = Number.NEGATIVE_INFINITY;
      for (const block of Array.from(doc.querySelectorAll('p'))) {
        for (const rect of Array.from(block.getClientRects())) {
          if (left + rect.left >= box.left && left + rect.left < box.right) worst = Math.max(worst, left + rect.right - box.right);
        }
      }
      return worst;
    });
  await expect.poll(columnOverflow).toBeLessThanOrEqual(1);
  await expect.poll(async () => (await probe.words(page)).length).toBeGreaterThan(10);
  await expect(page.getByTestId('page-label')).toHaveText(label ?? '');
  await page.screenshot({ path: `test-results/reader-ask-${test.info().project.name}.png` });

  // Closing gives the book its full size back.
  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(panel).toBeHidden();
  await expect.poll(async () => (await pageBox(page)).width).toBe(before.width);
});

test('a translation is tinted so it never reads as book text', async ({ page }) => {
  const words = await probe.words(page);
  await probe.select(page, Math.floor(words.length / 3));
  const result = page.getByTestId('translation-result');
  await expect(result).toBeVisible();
  const colours = await page.evaluate(() => {
    const block = document.querySelector('[data-testid="translation-result"]');
    const frame = document.querySelector<HTMLIFrameElement>('.epub-container iframe');
    const pageDoc = frame?.contentDocument?.documentElement;
    return {
      block: block ? getComputedStyle(block).backgroundColor : '',
      page: pageDoc ? getComputedStyle(pageDoc).backgroundColor : '',
      panel: getComputedStyle(document.querySelector('[data-testid="lookup-panel"]')!).backgroundColor,
    };
  });
  expect(colours.block).not.toBe(colours.page);
  expect(colours.block).not.toBe(colours.panel);
  expect(colours.panel).not.toBe(colours.page);
  await page.screenshot({ path: `test-results/reader-translation-${test.info().project.name}.png` });
});
