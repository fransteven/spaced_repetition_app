import { expect, test } from '@playwright/test';

import { openReader } from './reader-probe';

declare global {
  interface Window {
    __bookScriptRan?: string;
  }
}

/**
 * The book iframe allows scripts (WebKit delivers no events otherwise), so a hostile EPUB
 * must stay inert: chapter 2 of the fixture carries scripts, inline handlers and script URLs.
 */
test('code inside a book never runs', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await openReader(page);

  await page.getByRole('button', { name: 'Contents' }).click();
  await page.getByRole('dialog').getByText('Chapter 2').click();
  const frame = page.frameLocator('.epub-container iframe');
  await expect(frame.locator('#hostile')).toBeAttached();

  const inspection = await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.epub-container iframe');
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return null;
    const handlers = Array.from(doc.querySelectorAll('*')).flatMap((element) =>
      Array.from(element.attributes)
        .map((attribute) => attribute.name)
        .filter((name) => name.toLowerCase().startsWith('on'))
    );
    return {
      sandbox: iframe.getAttribute('sandbox') ?? '',
      scripts: doc.querySelectorAll('script').length,
      frames: doc.querySelectorAll('iframe, object, embed').length,
      handlers,
      linkHref: doc.querySelector('#hostile-link')?.getAttribute('href') ?? null,
      csp: doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? '',
    };
  });
  expect(inspection).not.toBeNull();
  expect(inspection!.sandbox).toContain('allow-scripts');
  expect(inspection!.scripts).toBe(0);
  expect(inspection!.frames).toBe(0);
  expect(inspection!.handlers).toEqual([]);
  expect(inspection!.linkHref).toBeNull();
  expect(inspection!.csp).toContain("script-src 'none'");

  await frame.locator('#hostile').click({ position: { x: 4, y: 4 } });
  await frame.locator('#hostile-link').click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__bookScriptRan ?? null)).toBeNull();
  expect(dialogs).toEqual([]);
});
