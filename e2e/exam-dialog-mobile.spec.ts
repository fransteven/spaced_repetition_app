import { expect, test, type Page } from '@playwright/test';
import { z } from 'zod';

import { installFakeKeyboard, setKeyboard } from './fake-keyboard';

const CreatedResource = z.object({ data: z.object({ id: z.string() }) });
const Box = z.object({ top: z.number(), bottom: z.number(), height: z.number() });

// Pixels the fake on-screen keyboard takes from the bottom of the screen.
const KEYBOARD_PX = 320;

async function boxOf(page: Page, selector: string): Promise<z.infer<typeof Box>> {
  return Box.parse(
    await page.locator(selector).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    }),
  );
}

test('"Quiz me with AI" fits a phone screen and keeps the answer visible above the keyboard', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chrome', 'phone layout');
  test.setTimeout(120_000);
  await installFakeKeyboard(page);

  await page.route('**/api/study/exam', async (route) => {
    await route.fulfill({
      json: {
        data: {
          message: 'In your own words, what does this card ask you to remember? Explain it with an example.',
          done: false,
          verdict: null,
          examToken: 'e2e-token',
        },
        error: null,
      },
    });
  });

  await page.goto('/decks');
  const deckResponse = await page.request.post('/api/decks', {
    data: { name: `Exam mobile ${Date.now()}`, subject: 'custom' },
  });
  expect(deckResponse.ok()).toBe(true);
  const { data: deck } = CreatedResource.parse(await deckResponse.json());

  try {
    const cardResponse = await page.request.post('/api/cards', {
      data: { deck_id: deck.id, front: 'What is spaced repetition?', back: 'Reviewing at growing intervals.' },
    });
    expect(cardResponse.ok()).toBe(true);

    await page.goto(`/study/${deck.id}`);
    await page.getByRole('button', { name: /Show answer/ }).click();
    await page.getByRole('button', { name: /Quiz me with AI/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('In your own words')).toBeVisible();
    const answer = dialog.getByRole('textbox', { name: 'Your answer' });

    // iOS zooms the page when an input under 16px gets focus.
    await expect(answer).toHaveCSS('font-size', '16px');

    // The sheet fills the phone screen (polled: it scales in when it opens).
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    await expect.poll(async () => (await boxOf(page, '[role="dialog"]')).top).toBeLessThanOrEqual(1);
    const sheet = await boxOf(page, '[role="dialog"]');
    expect(Math.abs(sheet.bottom - viewportHeight)).toBeLessThanOrEqual(1);

    // Keyboard opens: the sheet shrinks to the visible area and the answer box stays above it.
    await answer.click();
    await setKeyboard(page, KEYBOARD_PX);
    const visible = viewportHeight - KEYBOARD_PX;
    await expect.poll(async () => (await boxOf(page, '[role="dialog"]')).bottom).toBeLessThanOrEqual(visible + 1);

    // A long answer grows the box so the user sees what they are sending, still above the keyboard.
    const before = await boxOf(page, '[role="dialog"] textarea');
    await answer.fill('It means reviewing a card\nright before you would forget it,\nso each review\nlasts longer.');
    await expect.poll(async () => (await boxOf(page, '[role="dialog"] textarea')).height).toBeGreaterThan(before.height + 20);
    const grown = await boxOf(page, '[role="dialog"] textarea');
    expect(grown.bottom).toBeLessThanOrEqual(visible + 1);
    expect(grown.top).toBeGreaterThan(0);
    await expect(dialog.getByRole('button', { name: 'Send answer' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('exam-keyboard.png') });

    // Keyboard closes: back to the full screen.
    await setKeyboard(page, 0);
    await expect.poll(async () => (await boxOf(page, '[role="dialog"]')).bottom).toBeGreaterThan(viewportHeight - 2);

    await dialog.getByRole('button', { name: 'Close quiz' }).click();
    await expect(dialog).toBeHidden();
  } finally {
    const deleted = await page.request.delete(`/api/decks/${deck.id}`);
    expect(deleted.ok()).toBe(true);
  }
});
