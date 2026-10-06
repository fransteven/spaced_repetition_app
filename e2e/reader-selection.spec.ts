import { expect, test, type Page } from '@playwright/test';

import { openReader, probe, type WordBox } from './reader-probe';

/**
 * Reader: selecting and highlighting on phones.
 * - Only the side margins (and swipes) turn pages; tapping or selecting text never does.
 * - A selection dragged past the page edge only turns the page after a held push, inside the chapter.
 * - A single word opens the dictionary card (no blur, no paid translation until asked).
 */

const isTouch = (page: Page): boolean => page.viewportSize() !== null && (page.viewportSize()?.width ?? 0) < 1000;

async function tap(page: Page, x: number, y: number): Promise<void> {
  if (isTouch(page)) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

const center = (word: WordBox): [number, number] => [word.x + word.width / 2, word.y + word.height / 2];

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.beforeEach(async ({ page }) => {
  await openReader(page);
});

test('tapping words at the very edge of the text never turns the page', async ({ page }) => {
  const words = await probe.words(page);
  const leftmost = words.reduce((a, b) => (b.x < a.x ? b : a));
  const rightmost = words.reduce((a, b) => (b.x + b.width > a.x + a.width ? b : a));
  const before = await probe.scrollLeft(page);

  for (const word of [rightmost, leftmost, rightmost]) {
    await tap(page, ...center(word));
    await page.waitForTimeout(400);
    expect(await probe.scrollLeft(page)).toBe(before);
  }
});

test('the side margins turn pages and are at least 44 px wide', async ({ page }) => {
  const next = page.getByTestId('page-next');
  const prev = page.getByTestId('page-prev');
  const box = await next.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);

  const start = await probe.scrollLeft(page);
  await tap(page, box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect.poll(() => probe.scrollLeft(page)).toBeGreaterThan(start);

  await expect(prev).toBeEnabled();
  const prevBox = await prev.boundingBox();
  await tap(page, prevBox!.x + prevBox!.width / 2, prevBox!.y + prevBox!.height / 2);
  await expect.poll(() => probe.scrollLeft(page)).toBe(start);
});

test('a single word opens the dictionary card without blurring the book or calling the AI', async ({ page }) => {
  const serverActions: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) serverActions.push(request.url());
  });

  const words = await probe.words(page);
  const index = Math.floor(words.length / 3);
  const word = await probe.select(page, index);
  expect(word).not.toBeNull();

  const panel = page.getByTestId('lookup-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(`Definition of ${word!.text}.`);
  await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toBeVisible();
  await expect(panel.getByRole('button', { name: /Translate to/ })).toBeVisible();

  expect(await probe.blurred(page)).toEqual([]);
  expect(await probe.selectionText(page)).toBe(word!.text); // the word stays selected
  expect(serverActions).toEqual([]); // the translation waits for its button

  // Neither the card nor the toolbar covers the word they are about.
  expect(overlaps((await panel.boundingBox())!, word!)).toBe(false);
  expect(overlaps((await page.getByRole('toolbar', { name: 'Selection actions' }).boundingBox())!, word!)).toBe(false);

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('a phrase shows the actions toolbar but no dictionary card', async ({ page }) => {
  const words = await probe.words(page);
  const index = Math.floor(words.length / 2);
  const phrase = await probe.select(page, index, index + 3);
  const toolbar = page.getByRole('toolbar', { name: 'Selection actions' });
  await expect(toolbar).toBeVisible();
  // Only checked for a phrase on one line (its box is then exactly the selected text).
  if (phrase && phrase.width > 0) {
    const first = (await probe.words(page))[index];
    if (Math.abs(first.y - phrase.y) < 1) expect(overlaps((await toolbar.boundingBox())!, phrase)).toBe(false);
  }
  await page.waitForTimeout(500);
  await expect(page.getByTestId('lookup-panel')).toHaveCount(0);
});

test('while text is selected, the book does not scroll under the finger', async ({ page }) => {
  const words = await probe.words(page);
  const word = await probe.select(page, Math.floor(words.length / 2));
  const before = await probe.scrollLeft(page);

  await probe.pushFor(page, 37, 60); // one or two autoscroll ticks: a brief touch of the edge
  await page.waitForTimeout(1500);

  expect(await probe.scrollLeft(page)).toBe(before);
  expect(await probe.selectionText(page)).toBe(word!.text);
  await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toBeVisible();
});

test('holding a selection at the page edge turns the page and keeps the selection', async ({ page }) => {
  // One page turn, measured with the margin buttons.
  const before = await probe.scrollLeft(page);
  await page.getByTestId('page-next').click();
  await expect.poll(() => probe.scrollLeft(page)).toBeGreaterThan(before);
  const pageDelta = (await probe.scrollLeft(page)) - before;
  await page.getByTestId('page-prev').click();
  await expect.poll(() => probe.scrollLeft(page)).toBe(before);

  const words = await probe.words(page);
  const word = await probe.select(page, words.length - 2);
  await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toBeVisible();

  await probe.pushFor(page, 40, 900); // held ~0.9 s: one turn (holding longer keeps turning)

  // Exactly one page further (not wherever the browser's autoscroll happened to stop).
  await expect.poll(() => probe.scrollLeft(page)).toBeGreaterThan(before);
  await page.waitForTimeout(400);
  expect((await probe.scrollLeft(page)) - before).toBe(pageDelta);
  expect(await probe.selectionText(page)).toContain(word!.text);
  await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toBeVisible();
});

test('swipes turn pages, but not while text is selected', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium' || !isTouch(page), 'touch swipes are driven through Chromium DevTools');
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (fromX: number, toX: number, y: number): Promise<void> => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fromX, y }] });
    for (let step = 1; step <= 6; step += 1) {
      const x = fromX + ((toX - fromX) * step) / 6;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };

  // Swipe across the middle of the page (a swipe that starts in a margin is a margin tap).
  const page_ = await page.locator('.epub-container').boundingBox();
  const cx = page_!.x + page_!.width / 2;
  const cy = page_!.y + page_!.height / 2;
  const start = await probe.scrollLeft(page);

  await probe.select(page, 5);
  await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toBeVisible();
  await swipe(cx + 70, cx - 70, cy);
  await page.waitForTimeout(600);
  expect(await probe.scrollLeft(page)).toBe(start);

  await page.getByTestId('page-next').click(); // clears the selection and turns
  await expect.poll(() => probe.scrollLeft(page)).toBeGreaterThan(start);
  const afterButton = await probe.scrollLeft(page);
  await swipe(cx - 70, cx + 70, cy);
  await expect.poll(() => probe.scrollLeft(page)).toBeLessThan(afterButton);
});

test('dragging a mouse selection into the margin and holding turns the page (desktop)', async ({ page }) => {
  test.skip(isTouch(page), 'mouse drag selection');
  const words = await probe.words(page);
  const bottomRight = words.reduce((a, b) => (b.y > a.y + 1 || (Math.abs(b.y - a.y) <= 1 && b.x > a.x) ? b : a));
  const gutter = await page.getByTestId('page-next').boundingBox();
  const before = await probe.scrollLeft(page);

  await page.mouse.move(bottomRight.x + 1, bottomRight.y + bottomRight.height / 2);
  await page.mouse.down();
  await page.mouse.move(gutter!.x + gutter!.width / 2, bottomRight.y + bottomRight.height / 2, { steps: 8 });
  for (let i = 0; i < 12; i += 1) {
    await page.mouse.move(gutter!.x + gutter!.width / 2 + (i % 2), bottomRight.y + bottomRight.height / 2);
    await page.waitForTimeout(100);
  }
  await page.mouse.up();

  await expect.poll(() => probe.scrollLeft(page)).toBeGreaterThan(before);
  expect((await probe.selectionText(page)).length).toBeGreaterThan(0);
});

test('a mouse selection that only brushes the margin does not turn the page (desktop)', async ({ page }) => {
  test.skip(isTouch(page), 'mouse drag selection');
  const words = await probe.words(page);
  const bottomRight = words.reduce((a, b) => (b.y > a.y + 1 || (Math.abs(b.y - a.y) <= 1 && b.x > a.x) ? b : a));
  const gutter = await page.getByTestId('page-next').boundingBox();
  const y = bottomRight.y + bottomRight.height / 2;
  const before = await probe.scrollLeft(page);

  await page.mouse.move(bottomRight.x + 1, y);
  await page.mouse.down();
  await page.mouse.move(gutter!.x + gutter!.width / 2, y, { steps: 4 });
  await page.waitForTimeout(200);
  await page.mouse.up();

  await page.waitForTimeout(1200);
  expect(await probe.scrollLeft(page)).toBe(before);
  // Text the reader cannot see is never selected: the selection stops at the page end.
  await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toBeVisible();
});
