import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

import { db } from '@/lib/db';
import { apiTokens } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';

export type ApiToken = InferSelectModel<typeof apiTokens>;
export type ApiTokenSummary = Pick<ApiToken, 'id' | 'name' | 'token_prefix' | 'last_used_at' | 'created_at'>;

export const MAX_API_TOKENS_PER_USER = 10;
const TOKEN_PREFIX = 'nck_';
const TOKEN_SHAPE = /^nck_[A-Za-z0-9_-]{43}$/;
// Writing last_used_at on every MCP call would be a write per tool call; minutes are enough.
const LAST_USED_RESOLUTION_MS = 5 * 60 * 1000;

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isApiTokenShape(token: string): boolean {
  return TOKEN_SHAPE.test(token);
}

export async function listApiTokens(userId: string): Promise<ApiTokenSummary[]> {
  return db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      token_prefix: apiTokens.token_prefix,
      last_used_at: apiTokens.last_used_at,
      created_at: apiTokens.created_at,
    })
    .from(apiTokens)
    .where(eq(apiTokens.user_id, userId))
    .orderBy(desc(apiTokens.created_at));
}

/** Returns the plaintext token once; only its hash is kept. */
export async function createApiToken(userId: string, name: string): Promise<{ token: string; record: ApiTokenSummary }> {
  const existing = await db.$count(apiTokens, eq(apiTokens.user_id, userId));
  if (existing >= MAX_API_TOKENS_PER_USER) {
    throw new ServiceError('VALIDATION_ERROR', `You can have up to ${MAX_API_TOKENS_PER_USER} connections. Revoke one first.`);
  }
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
  const [record] = await db
    .insert(apiTokens)
    .values({
      user_id: userId,
      name: name.trim(),
      token_hash: hashApiToken(token),
      token_prefix: token.slice(0, TOKEN_PREFIX.length + 6),
    })
    .returning({
      id: apiTokens.id,
      name: apiTokens.name,
      token_prefix: apiTokens.token_prefix,
      last_used_at: apiTokens.last_used_at,
      created_at: apiTokens.created_at,
    });
  return { token, record };
}

export async function revokeApiToken(userId: string, tokenId: string): Promise<void> {
  const [token] = await db.select({ user_id: apiTokens.user_id }).from(apiTokens).where(eq(apiTokens.id, tokenId));
  if (!token) throw new ServiceError('NOT_FOUND', 'Connection not found');
  if (token.user_id !== userId) throw new ServiceError('FORBIDDEN', 'Access denied');
  await db.delete(apiTokens).where(and(eq(apiTokens.id, tokenId), eq(apiTokens.user_id, userId)));
}

/** The owner of a valid token, or null. Malformed tokens never reach the database. */
export async function resolveApiToken(token: string): Promise<string | null> {
  if (!isApiTokenShape(token)) return null;
  const [record] = await db
    .select({ id: apiTokens.id, user_id: apiTokens.user_id, last_used_at: apiTokens.last_used_at })
    .from(apiTokens)
    .where(eq(apiTokens.token_hash, hashApiToken(token)));
  if (!record) return null;

  const now = new Date();
  if (!record.last_used_at || now.getTime() - record.last_used_at.getTime() > LAST_USED_RESOLUTION_MS) {
    await db.update(apiTokens).set({ last_used_at: now }).where(eq(apiTokens.id, record.id));
  }
  return record.user_id;
}
