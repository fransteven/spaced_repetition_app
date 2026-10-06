import { defineConfig, devices } from '@playwright/test';

import { BASE_URL, PORT, STORAGE_STATE, testEnv } from './e2e/env';

/**
 * E2E: a dedicated production build served on :3100 with the e2e database branch (.env.test) and its own
 * build dir, so it runs next to `npm run dev` without sharing state or touching production.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: BASE_URL, trace: 'retain-on-failure' },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'android-chrome',
      use: { ...devices['Pixel 7'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'iphone-safari',
      use: { ...devices['iPhone 14'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    // A production build: dev-mode on-demand compiles reload the page mid-test.
    command: `npx next build && npx next start --port ${PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 600_000,
    env: {
      ...testEnv,
      NEXT_DIST_DIR: '.next-e2e',
      NEXTAUTH_URL: BASE_URL,
      AUTH_URL: BASE_URL,
      AUTH_TRUST_HOST: 'true',
    },
  },
});
