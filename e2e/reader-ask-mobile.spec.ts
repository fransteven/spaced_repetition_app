import { expect, test, type Page } from '@playwright/test';

import { installFakeKeyboard, setKeyboard } from './fake-keyboard';
import { openReader } from './reader-probe';

/**
 * "Ask this book" below 768 px (phones, small tablets) covers the whole visible screen so answers are
 * comfortable to read, and stays above the on-screen keyboard while the reader types.
 */

const KEYBOARD_PX = 320;

const panelBox = (page: Page): Promise<{ top: number; bottom: number; width: number }> =>
  page.getByTestId('ask-panel').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, width: r.width };
  });

test('Ask this book is full screen on a phone and keeps the question box above the keyboard', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chrome', 'phone layout');
  await installFakeKeyboard(page);
  await openReader(page);

  await page.getByRole('button', { name: 'Ask this book' }).click();
  const panel = page.getByTestId('ask-panel');
  await expect(panel).toBeVisible();
  const { width, height } = page.viewportSize()!;
  const full = await panelBox(page);
  expect(full.top).toBeLessThanOrEqual(1);
  expect(full.bottom).toBeGreaterThanOrEqual(height - 1);
  expect(full.width).toBeGreaterThanOrEqual(width - 1);

  const question = panel.getByRole('textbox', { name: 'Your question' });
  await question.click();
  await setKeyboard(page, KEYBOARD_PX);
  const visible = height - KEYBOARD_PX;
  await expect.poll(async () => (await panelBox(page)).bottom).toBeLessThanOrEqual(visible + 1);
  await question.fill('Who is the narrator\nand why does he return\nto the house?');
  const box = (await question.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(visible + 1);
  await expect(panel.getByRole('button', { name: 'Ask', exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('ask-keyboard.png') });

  await setKeyboard(page, 0);
  await expect.poll(async () => (await panelBox(page)).bottom).toBeGreaterThanOrEqual(height - 1);
});

test('Ask this book is full screen on a small tablet and docked from 768 px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'one browser for the size matrix');
  await page.setViewportSize({ width: 744, height: 1133 }); // iPad mini, portrait
  await openReader(page);
  await page.getByRole('button', { name: 'Ask this book' }).click();
  const mini = await panelBox(page);
  expect(mini.top).toBeLessThanOrEqual(1);
  expect(mini.width).toBeGreaterThanOrEqual(743);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect.poll(async () => (await panelBox(page)).width).toBeLessThan(500);
  expect((await panelBox(page)).top).toBeGreaterThan(40); // below the top bar, beside the page
});
