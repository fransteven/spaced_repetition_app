import crypto from 'node:crypto';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

import * as schema from '../src/lib/db/schema';
import { AUTH_DIR, BOOK_ID, CREDENTIALS_FILE, TEST_EMAIL, assertTestDatabase } from './env';
import { fixtureEpub } from './fixtures/epub';

/** Seeds the test user and the fixture book in the e2e database branch (idempotent). */
export default async function globalSetup(): Promise<void> {
  const db = drizzle(neon(assertTestDatabase()), { schema });
  const { users, books, bookAnnotations, bookBookmarks, readerPreferences } = schema;

  // A fresh random password per run: it only lives in e2e/.auth (gitignored) and in this branch.
  const password = crypto.randomBytes(18).toString('base64url');
  const hash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ email: TEST_EMAIL, name: 'E2E Reader', password: hash })
    .onConflictDoUpdate({ target: users.email, set: { password: hash } })
    .returning({ id: users.id });

  const epub = await fixtureEpub();
  const book = {
    user_id: user.id,
    title: 'E2E Fixture Book',
    author: 'NeuroCards',
    language: 'en',
    blob_pathname: `e2e/${user.id}/fixture.epub`,
    file_size: epub.length,
    status: 'ready' as const,
    locations_json: null,
    last_cfi: null,
    progress: 0,
  };
  await db.insert(books).values({ id: BOOK_ID, ...book }).onConflictDoUpdate({ target: books.id, set: book });
  await db.delete(bookAnnotations).where(eq(bookAnnotations.book_id, BOOK_ID));
  await db.delete(bookBookmarks).where(eq(bookBookmarks.book_id, BOOK_ID));
  await db.delete(readerPreferences).where(eq(readerPreferences.user_id, user.id));

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify({ email: TEST_EMAIL, password }));
}
