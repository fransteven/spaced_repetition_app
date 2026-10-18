import { expect, test, type Page } from '@playwright/test';
import { openReader, probe } from './reader-probe';

async function settings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Reading settings', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function reset(page: Page): Promise<void> {
  if (!(await page.getByRole('dialog').isVisible())) await settings(page);
  await page.getByRole('button', { name: 'Reset settings', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Preferences synced across devices');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
}

async function iframeStyles(page: Page): Promise<{ background: string; font: string; spacing: string; size: string }> {
  return page.evaluate(() => {
    const doc = document.querySelector<HTMLIFrameElement>('.epub-container iframe')?.contentDocument;
    if (!doc) return { background: '', font: '', spacing: '', size: '' };
    return {
      background: getComputedStyle(doc.documentElement).backgroundColor,
      font: getComputedStyle(doc.body).fontFamily,
      spacing: getComputedStyle(doc.body).lineHeight,
      size: getComputedStyle(doc.documentElement).fontSize,
    };
  });
}

test.beforeEach(async ({ page }) => { await openReader(page); await reset(page); });
test.afterEach(async ({ page }) => {
  // Restore the shared E2E user's defaults for the existing suites.
  if (await page.getByRole('dialog').isVisible()) {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  }
  await page.keyboard.press('Escape');
  await reset(page);
});

test('every theme reaches the book, browser tint and settings, independently of app theme', async ({ page }, testInfo) => {
  await settings(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const themes = [
    { label: 'Sepia', value: 'sepia', rgb: 'rgb(241, 227, 202)' },
    { label: 'Paper', value: 'paper', rgb: 'rgb(250, 246, 237)' },
    { label: 'Sage', value: 'sage', rgb: 'rgb(232, 238, 229)' },
    { label: 'Light', value: 'light', rgb: 'rgb(255, 255, 255)' },
    { label: 'Slate', value: 'slate', rgb: 'rgb(24, 35, 45)' },
    { label: 'Dark', value: 'dark', rgb: 'rgb(0, 0, 0)' },
  ];
  for (const theme of themes) {
    await page.getByRole('button', { name: `${theme.label} theme`, exact: true }).click();
    await expect.poll(async () => (await iframeStyles(page)).background).toBe(theme.rgb);
    await expect(page.locator('html')).toHaveAttribute('data-reader-theme', theme.value);
    const matchingTint = await page.evaluate(() => {
      const root = document.documentElement;
      return document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content === getComputedStyle(root).getPropertyValue('--background').trim();
    });
    expect(matchingTint).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`settings-${theme.value}.png`) });
  }
  await page.getByRole('button', { name: 'Auto theme', exact: true }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-reader-theme');
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
});

test('new fonts load locally in the book and preview, and rapid choices survive reload', async ({ page }) => {
  const failedFonts: string[] = [];
  page.on('response', (response) => { if (response.url().includes('/fonts/') && !response.ok()) failedFonts.push(response.url()); });
  await settings(page);
  for (const font of [
    { label: 'Literata', family: 'Literata' },
    { label: 'Source Serif', family: 'Source Serif 4' },
    { label: 'Atkinson', family: 'Atkinson Hyperlegible' },
    { label: 'Sans', family: 'Reader Sans' },
  ]) {
    await page.getByRole('button', { name: `${font.label} font`, exact: true }).click();
    await expect.poll(async () => (await iframeStyles(page)).font).toContain(font.family);
    const loaded = await page.evaluate(async (family) => {
      const doc = document.querySelector<HTMLIFrameElement>('.epub-container iframe')?.contentDocument;
      if (!doc) return false;
      const faces = await doc.fonts.load(`16px "${family}"`, 'Árbol, mañana, cœur');
      return faces.length > 0 && faces.every((face) => face.status === 'loaded');
    }, font.family);
    expect(loaded).toBe(true);
    await expect(page.frameLocator('iframe[title="Reading preview"]').locator('body')).toHaveCSS('font-family', new RegExp(font.family));
  }
  await page.getByRole('button', { name: 'Night preset', exact: true }).click();
  await page.getByRole('button', { name: 'Rest preset', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Preferences synced across devices');
  await page.reload();
  await expect(page.getByTestId('page-label')).toHaveText(/\d/);
  await settings(page);
  await expect(page.getByRole('button', { name: 'Rest preset', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Atkinson font', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Relaxed', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Paper theme', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(failedFonts).toEqual([]);
});

test('presets update all controls and focus hides chrome without changing page geometry', async ({ page }) => {
  const before = await page.locator('.epub-container').boundingBox();
  await settings(page);
  await page.getByRole('button', { name: 'Night preset', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Comfort', exact: true })).toHaveClass(/bg-primary/);
  await page.getByRole('button', { name: 'Larger text', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Night preset', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Editorial preset', exact: true }).click();
  await page.getByRole('button', { name: 'Start reading', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByTestId('reader-header')).toHaveAttribute('inert');
  const focused = await page.locator('.epub-container').boundingBox();
  expect(focused?.y).toBe(before?.y);
  expect(focused?.height).toBe(before?.height);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('reader-header')).not.toHaveAttribute('inert');
  await expect(page.getByTestId('page-label')).toHaveText(/\d/);
});

test('typography keeps the saved passage on screen after reflow', async ({ page }) => {
  for (let i = 0; i < 3; i += 1) {
    await page.getByTestId('page-next').click();
    await page.waitForTimeout(450);
  }
  // Keep the exact DOM text node and offset, rather than comparing repeating fixture words.
  const marker = await page.evaluate(() => {
    const frame = document.querySelector<HTMLIFrameElement>('.epub-container iframe');
    const doc = frame?.contentDocument;
    const box = document.querySelector('.epub-container')?.getBoundingClientRect();
    if (!doc || !frame || !box) return null;
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const offset = frame.getBoundingClientRect();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const word of (node.textContent ?? '').matchAll(/\p{L}+/gu)) {
        const range = doc.createRange(); range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
        const rect = range.getBoundingClientRect();
        const x = offset.left + rect.left; const y = offset.top + rect.top;
        if (rect.width && x >= box.left && x + rect.width <= box.right && y >= box.top && y + rect.height <= box.bottom) {
          const parent = node.parentElement;
          if (!parent) continue;
          parent.id = 'comfort-anchor';
          return { offset: word.index, length: word[0].length };
        }
      }
    }
    return null;
  });
  expect(marker).not.toBeNull();
  await settings(page);
  await page.getByRole('button', { name: 'Rest preset', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate((target) => {
    if (!target) return false;
    const frame = document.querySelector<HTMLIFrameElement>('.epub-container iframe');
    const node = frame?.contentDocument?.getElementById('comfort-anchor')?.firstChild;
    const box = document.querySelector('.epub-container')?.getBoundingClientRect();
    if (!frame || !node || !box) return false;
    const range = node.ownerDocument?.createRange();
    if (!range) return false;
    range.setStart(node, target.offset); range.setEnd(node, target.offset + target.length);
    const rect = range.getBoundingClientRect(); const offset = frame.getBoundingClientRect();
    return offset.left + rect.left >= box.left - 1 && offset.left + rect.right <= box.right + 1 && offset.top + rect.top >= box.top - 1 && offset.top + rect.bottom <= box.bottom + 1;
  }, marker), { timeout: 10_000 }).toBe(true);
  expect((await probe.words(page)).length).toBeGreaterThan(20);
});


test('a failed preference request stays visible and can be retried', async ({ page }) => {
  let interrupted = false;
  await page.route('**/read/**', async (route) => {
    const request = route.request();
    if (!interrupted && request.method() === 'POST' && request.headers()['next-action'] &&
        request.postData()?.includes('font_family') && request.postData()?.includes('sage')) {
      interrupted = true;
      await route.abort('failed');
      return;
    }
    await route.fallback();
  });
  await settings(page);
  await page.getByRole('button', { name: 'Sage theme', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Could not save preferences.');
  await expect(page.locator('html')).toHaveAttribute('data-reader-theme', 'sage');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Preferences synced across devices');
  expect(interrupted).toBe(true);
});


test('minimum and maximum text sizes remain editable after a database round trip', async ({ page }) => {
  await settings(page);
  for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Smaller text', exact: true }).click();
  await expect(page.getByText('70%', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Preferences synced across devices');
  await page.reload();
  await expect(page.getByTestId('page-label')).toHaveText(/\d/);
  await settings(page);
  await expect(page.getByRole('button', { name: 'Smaller text', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Sage theme', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Preferences synced across devices');
  for (let i = 0; i < 9; i += 1) await page.getByRole('button', { name: 'Larger text', exact: true }).click();
  await expect(page.getByText('160%', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Preferences synced across devices');
  await page.reload();
  await expect(page.getByTestId('page-label')).toHaveText(/\d/);
  await settings(page);
  await expect(page.getByRole('button', { name: 'Larger text', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Slate theme', exact: true }).click();
  await page.getByRole('button', { name: 'Relaxed', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Preferences synced across devices');
  const previewFits = await page.frameLocator('iframe[title="Reading preview"]').locator('html').evaluate((element) =>
    element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth
  );
  expect(previewFits).toBe(true);
});
