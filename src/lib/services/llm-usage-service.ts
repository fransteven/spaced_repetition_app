import { and, count, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { llmUsage, users, type LlmUsageKind } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';

/**
 * Daily cap on paid LLM calls per user (OpenAI is billed per use and registration is open).
 * Each call reserves one row in llm_usage; the day is counted in UTC, like voice exams.
 */

const DEFAULT_LIMITS: Record<LlmUsageKind, number> = { ask: 100, translate: 300, suggest: 100 };
const ENV_NAMES: Record<LlmUsageKind, string> = {
  ask: 'LLM_DAILY_LIMIT_ASK',
  translate: 'LLM_DAILY_LIMIT_TRANSLATE',
  suggest: 'LLM_DAILY_LIMIT_SUGGEST',
};
const LABELS: Record<LlmUsageKind, string> = {
  ask: 'questions',
  translate: 'translations',
  suggest: 'card suggestions',
};

export function dailyLimitFor(kind: LlmUsageKind): number {
  const configured = Number(process.env[ENV_NAMES[kind]]);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_LIMITS[kind];
}

/** Counts this call against today's cap or throws UNAVAILABLE when the cap is reached. */
export async function reserveLlmCall(userId: string, kind: LlmUsageKind): Promise<void> {
  const limit = dailyLimitFor(kind);
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  await db.transaction(async (tx) => {
    // Serializes one user's concurrent calls, so a burst cannot slip past the cap.
    const [owner] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
    if (!owner) throw new ServiceError('NOT_FOUND', 'User not found');

    const [used] = await tx
      .select({ total: count() })
      .from(llmUsage)
      .where(and(eq(llmUsage.user_id, userId), eq(llmUsage.kind, kind), gte(llmUsage.created_at, dayStart)));
    if ((used?.total ?? 0) >= limit) {
      throw new ServiceError('UNAVAILABLE', `Daily limit reached (${limit} ${LABELS[kind]} per day). It resets at midnight UTC.`);
    }
    await tx.insert(llmUsage).values({ user_id: userId, kind });
  });
}
