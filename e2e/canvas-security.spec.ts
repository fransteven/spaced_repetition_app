import { expect, test } from '@playwright/test';

import { hostileCanvas } from './fixtures/canvas';

declare global {
  interface Window {
    __canvasEscaped?: string;
  }
}

/**
 * Canvases are LLM-written HTML with scripts, stored as-is. They must run in an opaque origin:
 * no cookies, no parent DOM, no API calls with the session, no pop-ups, no tab navigation.
 */
test('code inside a canvas never reaches the app', async ({ page }) => {
  await page.goto('/mind-maps/canvases');
  await page.getByTestId('canvas-file-input').setInputFiles(hostileCanvas());
  await expect(page).toHaveURL(/\/mind-maps\/canvases\/[0-9a-f-]{36}$/);
  const viewerUrl = page.url();
  const id = viewerUrl.split('/').pop() ?? '';

  const frame = page.frameLocator('iframe[title="Hostile canvas"]');
  const report = frame.locator('#report');
  await expect(report).not.toHaveText('running');
  const result = JSON.parse((await report.textContent()) ?? '{}') as Record<string, string>;

  expect(result.origin).toBe('null');
  expect(result.cookie).not.toMatch(/authjs|next-auth/);
  expect(result.parent).toMatch(/^blocked:/);
  expect(result.popup).not.toBe('opened');
  expect(result.fetch).toBe('blocked');
  // The storage shim keeps canvases that use localStorage working inside the sandbox.
  expect(result.storage).toBe('v');

  expect(page.url()).toBe(viewerUrl);
  expect(await page.evaluate(() => window.__canvasEscaped)).toBeUndefined();
  await expect(page.getByRole('heading', { level: 1, name: 'Hostile canvas' })).toBeVisible();

  // Opened directly, the document is still sandboxed by its own CSP and never cached.
  const raw = await page.request.get(`/api/canvases/${id}/raw`);
  expect(raw.status()).toBe(200);
  const headers = raw.headers();
  expect(headers['content-security-policy']).toMatch(/^sandbox allow-scripts;/);
  expect(headers['content-security-policy']).toContain("connect-src 'none'");
  expect(headers['content-type']).toBe('text/html; charset=utf-8');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['cache-control']).toContain('no-store');

  const missing = await page.request.get('/api/canvases/00000000-0000-4000-8000-000000000000/raw');
  expect(missing.status()).toBe(404);
  expect(await missing.json()).toEqual({ data: null, error: { code: 'NOT_FOUND', message: 'Canvas not found' } });
});

test('signed-out requests never get a canvas', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const response = await context.request.get('/api/canvases/00000000-0000-4000-8000-000000000000/raw');
  expect(response.status()).toBe(401);
  const upload = await context.request.post('/api/canvases', {
    multipart: { file: { name: 'x.html', mimeType: 'text/html', buffer: Buffer.from('<p>x</p>') } },
  });
  expect(upload.status()).toBe(401);
  await context.close();
});
