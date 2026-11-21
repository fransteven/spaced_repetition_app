import { expect, test, type Page } from '@playwright/test';

import { counterCanvas } from './fixtures/canvas';

async function noHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test('upload a canvas, use it, rename it and delete it', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const title = `Entropy ${testInfo.project.name} ${Date.now()}`;

  // Tabs: both live under the "Mind maps" nav item.
  await page.goto('/mind-maps');
  const tabs = page.getByRole('navigation', { name: 'Mind maps and canvases' });
  await expect(tabs.getByRole('link', { name: 'Mind maps' })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('link', { name: 'Canvases' }).click();
  await expect(page).toHaveURL(/\/mind-maps\/canvases$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Canvases' })).toBeVisible();
  await expect(tabs.getByRole('link', { name: 'Canvases' })).toHaveAttribute('aria-current', 'page');
  expect(await noHorizontalScroll(page)).toBe(true);

  // Rejected before upload: only .html files.
  await page.getByTestId('canvas-file-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await expect(page.getByText('Only .html files are supported')).toBeVisible();

  await page.getByTestId('canvas-file-input').setInputFiles(counterCanvas(title));
  await expect(page).toHaveURL(/\/mind-maps\/canvases\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

  // Immersive viewer: no app navigation, the canvas fills the rest of the screen.
  await expect(page.getByRole('navigation', { name: 'Mind maps and canvases' })).toHaveCount(0);
  const iframe = page.locator(`iframe[title="${title}"]`);
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');
  const box = await iframe.boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport ? box.height / viewport.height : 0).toBeGreaterThan(0.8);

  const frame = page.frameLocator(`iframe[title="${title}"]`);
  await frame.getByRole('button', { name: '0' }).click();
  await expect(frame.getByRole('button', { name: '1' })).toBeVisible();
  await expect(frame.getByText('saved 1')).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('canvas.png') });

  const renamed = `${title} (renamed)`;
  await page.getByRole('button', { name: 'Rename canvas' }).click();
  await page.getByLabel('Title').fill(renamed);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { level: 1, name: renamed })).toBeVisible();

  await page.getByRole('button', { name: 'Back to canvases' }).click();
  await expect(page).toHaveURL(/\/mind-maps\/canvases$/);
  const card = page.getByRole('link', { name: new RegExp(renamed.replace(/[()]/g, '\\$&')) });
  await expect(card).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);

  await card.click();
  await page.getByRole('button', { name: 'Delete canvas' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete canvas' }).click();
  await expect(page).toHaveURL(/\/mind-maps\/canvases$/);
  await expect(page.getByRole('link', { name: new RegExp(renamed.replace(/[()]/g, '\\$&')) })).toHaveCount(0);
});
