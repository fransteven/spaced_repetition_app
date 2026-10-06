import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';

/**
 * E2E environment, read only from .env.test (a Neon branch made for tests).
 * It overrides .env.local for the test server, so the tests never touch production.
 */
const file = path.join(__dirname, '..', '.env.test');

export const testEnv: Record<string, string> = fs.existsSync(file) ? parse(fs.readFileSync(file)) : {};

export const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;
export const BOOK_ID = 'e2e00000-0000-4000-8000-000000000001';
export const TEST_EMAIL = 'e2e-reader@neurocards.test';
export const AUTH_DIR = path.join(__dirname, '.auth');
export const STORAGE_STATE = path.join(AUTH_DIR, 'user.json');
export const CREDENTIALS_FILE = path.join(AUTH_DIR, 'credentials.json');

export function assertTestDatabase(): string {
  const url = testEnv.DATABASE_URL;
  if (!url || testEnv.E2E_ALLOW_DB_WRITES !== '1') {
    throw new Error('E2E needs .env.test with DATABASE_URL (Neon "e2e" branch) and E2E_ALLOW_DB_WRITES=1');
  }
  return url;
}
