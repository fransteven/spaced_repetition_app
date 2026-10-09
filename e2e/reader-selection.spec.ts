import { expect, test, type Page } from '@playwright/test';

import { openReader, probe, type WordBox } from './reader-probe';

/**
 * Reader: selecting and highlighting on phones.
 * - Only the side margins (and swipes) turn pages; tapping or selecting text never does.
 * - Only a pointer held in the side margin turns the page under a selection (inside the chapter);
 *   the browser's autoscroll never does.
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

test('the side margins turn pages: narrow on touch screens, 44 px or more with a mouse', async ({ page }) => {
  const next = page.getByTestId('page-next');
  const prev = page.getByTestId('page-prev');
  const box = await next.boundingBox();
  const coarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(coarse ? 24 : 44);

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

test('a selection held at the page edge never turns the page on its own', async ({ page }) => {
  // On Android a native handle dragged to the top or bottom of the page hit-tests into the next column, so
  // the browser keeps autoscrolling: that alone must never flip pages (only a pointer held in the margin does).
  const words = await probe.words(page);
  const word = await probe.select(page, words.length - 2);
  await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toBeVisible();
  const before = await probe.scrollLeft(page);

  await probe.pushFor(page, 40, 2000);
  await page.waitForTimeout(600);

  expect(await probe.scrollLeft(page)).toBe(before);
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

test('on a phone the text fills most of the screen width', async ({ page }) => {
  test.skip(!isTouch(page), 'phone layout');
  const words = await probe.words(page);
  const left = Math.min(...words.map((word) => word.x));
  const right = Math.max(...words.map((word) => word.x + word.width));
  const width = page.viewportSize()!.width;
  expect((right - left) / width).toBeGreaterThan(0.8);
  await page.screenshot({ path: `test-results/reader-density-${test.info().project.name}.png` });
});

test('the Light theme is a pure white page', async ({ page }) => {
  test.skip(!isTouch(page) || test.info().project.name !== 'android-chrome', 'one project is enough');
  const pickTheme = async (name: string): Promise<void> => {
    await page.getByRole('button', { name: 'Reading settings' }).click();
    await page.getByRole('button', { name }).click();
    await page.keyboard.press('Escape');
  };
  await pickTheme('Light');
  const pageBackground = (): Promise<string> =>
    page.evaluate(() => {
      const doc = document.querySelector('iframe')?.contentDocument;
      return doc ? getComputedStyle(doc.documentElement).backgroundColor : '';
    });
  await expect.poll(pageBackground).toBe('rgb(255, 255, 255)');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  await page.screenshot({ path: 'test-results/reader-light.png' });
  await pickTheme('Sepia'); // leave the shared e2e user as the other tests expect it
});

test('a wide screen shows one full-width column by default, two pages only when chosen', async ({ page }) => {
  test.skip(isTouch(page), 'wide screen');
  const pickLayout = async (name: string): Promise<void> => {
    await page.getByRole('button', { name: 'Reading settings' }).click();
    await page.getByRole('button', { name }).click();
    await page.keyboard.press('Escape');
  };
  // Lines run across the page: a word sits in the middle of the screen, where a spread has its gutter.
  const middleCovered = async (): Promise<boolean> => {
    const mid = page.viewportSize()!.width / 2;
    return (await probe.words(page)).some((word) => word.x < mid && word.x + word.width > mid);
  };
  expect(await middleCovered()).toBe(true);

  await pickLayout('Two pages');
  await expect.poll(middleCovered).toBe(false);
  await page.screenshot({ path: 'test-results/reader-two-pages.png' });
  await pickLayout('One page'); // leave the shared e2e user on the default
  await expect.poll(middleCovered).toBe(true);
  await page.screenshot({ path: 'test-results/reader-one-page.png' });
});
