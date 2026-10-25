import type { Page } from '@playwright/test';

/**
 * Replaces window.visualViewport with one a test can shrink, like a phone's on-screen keyboard does.
 * Call before the first navigation; then `setKeyboard(page, px)` opens (px > 0) or closes (0) it.
 */
export async function installFakeKeyboard(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = new EventTarget();
    const state = { keyboard: 0 };
    // Live getters: innerHeight is not final until the viewport meta tag is parsed.
    const fake = Object.defineProperties(target, {
      height: { get: () => window.innerHeight - state.keyboard },
      width: { get: () => window.innerWidth },
      offsetTop: { value: 0 },
      offsetLeft: { value: 0 },
      pageTop: { value: 0 },
      pageLeft: { value: 0 },
      scale: { value: 1 },
    });
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => fake });
    Object.defineProperty(window, '__setKeyboard', {
      value: (px: number) => {
        state.keyboard = px;
        target.dispatchEvent(new Event('resize'));
      },
    });
  });
}

export async function setKeyboard(page: Page, px: number): Promise<void> {
  await page.evaluate((value) => {
    const setter: unknown = Reflect.get(window, '__setKeyboard');
    if (typeof setter === 'function') setter(value);
  }, px);
}
