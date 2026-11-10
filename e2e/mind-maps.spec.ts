import { expect, test, type Page } from '@playwright/test';

async function noHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test('build a mind map from Markdown, view it and fold a branch', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone-safari', 'Chromium phone + desktop cover the layout');
  test.setTimeout(120_000);

  await page.goto('/mind-maps/new');
  const title = `Cells ${testInfo.project.name} ${Date.now()}`;
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Outline (Markdown)').fill(`# Cell biology
## Organelles
- Nucleus
  - DNA
- Mitochondria
## Membrane
- Phospholipids
`);
  const preview = page.getByRole('region', { name: 'Preview' });
  await expect(preview.getByText('Mitochondria', { exact: true })).toBeVisible();
  await expect(page.getByText('7 / 1000 nodes')).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);

  await page.getByRole('button', { name: 'Save mind map' }).click();
  await expect(page).toHaveURL(/\/mind-maps\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

  const map = page.getByRole('group', { name: /Mind map: Cell biology/ });
  await expect(map.getByText('Nucleus', { exact: true })).toBeVisible();
  const organelles = map.getByRole('button', { name: 'Organelles' });
  await organelles.click();
  await expect(organelles).toHaveAttribute('aria-expanded', 'false');
  await expect(map.getByText('Nucleus', { exact: true })).toHaveCount(0);
  await expect(organelles.getByText('+3')).toBeVisible();
  await organelles.click();
  await expect(map.getByText('Nucleus', { exact: true })).toBeVisible();

  // Nodes never overlap.
  const boxes = await map.locator('button, div.absolute.w-max').evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect()).map(({ left, top, right, bottom }) => ({ left, top, right, bottom })),
  );
  for (let a = 0; a < boxes.length; a += 1) {
    for (let b = a + 1; b < boxes.length; b += 1) {
      const overlap =
        boxes[a].left < boxes[b].right - 1 && boxes[b].left < boxes[a].right - 1 &&
        boxes[a].top < boxes[b].bottom - 1 && boxes[b].top < boxes[a].bottom - 1;
      expect(overlap).toBe(false);
    }
  }
  expect(await noHorizontalScroll(page)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mind-map.png') });

  await page.goto('/mind-maps');
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
});

test('an AI assistant saves a mind map through MCP with a personal token', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'API flow: one browser is enough');
  test.setTimeout(120_000);

  await page.goto('/settings#ai-assistants');
  await page.getByLabel('New connection').fill('E2E assistant');
  await page.getByRole('button', { name: 'Create connection' }).click();
  const tokenField = page.locator('code', { hasText: /^nck_/ }).first();
  await expect(tokenField).toBeVisible();
  const token = (await tokenField.textContent())?.trim() ?? '';
  expect(token).toMatch(/^nck_[A-Za-z0-9_-]{43}$/);

  const mcp = async (method: string, params: Record<string, unknown>, url = `/api/mcp/${token}`) => {
    const response = await page.request.post(url, {
      headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
      data: { jsonrpc: '2.0', id: 1, method, params },
    });
    return { status: response.status(), body: await response.json() };
  };

  const init = await mcp('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'e2e', version: '1' },
  });
  expect(init.status).toBe(200);
  expect(init.body.result.serverInfo.name).toBe('neurocards-mind-maps');

  const title = `From MCP ${Date.now()}`;
  const created = await mcp('tools/call', {
    name: 'create_mind_map',
    arguments: { title, markdown: '# Spaced repetition\n## Why\n- Forgetting curve\n## How\n- FSRS\n- Reviews' },
  });
  expect(created.body.result.isError).toBeFalsy();
  const url: string = created.body.result.structuredContent.url;
  expect(url).toMatch(/\/mind-maps\/[0-9a-f-]{36}$/);

  // The bearer-header endpoint finds it too.
  const listed = await page.request.post('/api/mcp', {
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    data: { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_mind_maps', arguments: { query: title } } },
  });
  const listBody = await listed.json();
  expect(listBody.result.structuredContent.mind_maps).toHaveLength(1);

  await page.goto(new URL(url).pathname);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByText('From AI')).toBeVisible();
  await expect(page.getByRole('group', { name: /Mind map: Spaced repetition/ }).getByText('FSRS', { exact: true })).toBeVisible();

  // Revoking cuts the assistant off.
  await page.goto('/settings#ai-assistants');
  await page.getByRole('button', { name: 'Revoke' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByText('E2E assistant', { exact: true })).toHaveCount(0);
  expect((await mcp('tools/list', {})).status).toBe(401);
});
