import fs from 'node:fs';
import { expect, test as setup } from '@playwright/test';
import { z } from 'zod';

import { CREDENTIALS_FILE, STORAGE_STATE } from './env';

const CredentialsSchema = z.object({ email: z.string(), password: z.string() });

setup('sign in the e2e reader', async ({ page }) => {
  const credentials = CredentialsSchema.parse(JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8')));
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 });
  await page.context().storageState({ path: STORAGE_STATE });
});
