import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, gte, lt, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cards, cardSchedules, decks, users, voiceExamAttempts } from '@/lib/db/schema';
import { assertCardOwnership } from '@/lib/services/card-service';
import { gradeVoiceAnswer, VOICE_GRADING_MODEL } from '@/lib/services/voice-grading-service';
import { listSkills } from '@/lib/services/skill-service';
import { applyReview } from '@/lib/services/study-service';
import { ServiceError } from '@/lib/services/service-error';

const LIVE_MODEL = 'gemini-3.8-live';
const TICKET_LIFETIME_MS = 60_000;
// The conversation ends after two minutes; allow time for grading and spoken feedback.
const ATTEMPT_LIFETIME_MS = 180_000;
const DAILY_ATTEMPT_LIMIT = 30;

function hashTicket(ticket: string): string {
  return createHash('sha256').update(ticket).digest('hex');
}

export async function startVoiceAttempt(userId: string, cardId: string): Promise<{
  attempt_id: string;
  ticket: string;
  ws_url: string;
  ticket_expires_at: Date;
}> {
  await assertCardOwnership(userId, cardId);
  const wsUrl = process.env.VOICE_WS_URL;
  if (!wsUrl || !/^wss?:\/\//.test(wsUrl)) {
    throw new ServiceError('UNAVAILABLE', 'Voice service is not configured');
  }

  const ticket = randomBytes(32).toString('base64url');
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const attempt = await db.transaction(async (tx) => {
    // Serializes concurrent starts for one user without a partial SQL index.
    const [owner] = await tx.select({ id: users.id }).from(users)
      .where(eq(users.id, userId)).for('update');
    if (!owner) throw new ServiceError('NOT_FOUND', 'User not found');

    const active = await tx.select({ id: voiceExamAttempts.id })
      .from(voiceExamAttempts)
      .where(and(
        eq(voiceExamAttempts.user_id, userId),
        inArray(voiceExamAttempts.status, ['created', 'active', 'grading']),
        gt(voiceExamAttempts.expires_at, now),
      )).limit(1);
    if (active.length > 0) {
      throw new ServiceError('UNAVAILABLE', 'Finish or close the current voice exam first');
    }

    const daily = await tx.select({ id: voiceExamAttempts.id })
      .from(voiceExamAttempts)
      .where(and(
        eq(voiceExamAttempts.user_id, userId),
        gte(voiceExamAttempts.created_at, todayUTC),
      )).limit(DAILY_ATTEMPT_LIMIT);
    if (daily.length >= DAILY_ATTEMPT_LIMIT) {
      throw new ServiceError('UNAVAILABLE', 'Daily voice exam limit reached');
    }

    const [card] = await tx.select({
      cardUpdatedAt: cards.updated_at,
      reps: cardSchedules.reps,
      lastReview: cardSchedules.last_review,
    }).from(cards).innerJoin(cardSchedules, and(
      eq(cardSchedules.card_id, cards.id),
      eq(cardSchedules.user_id, userId),
    )).where(eq(cards.id, cardId));
    if (!card) throw new ServiceError('NOT_FOUND', 'Card schedule not found');

    const [created] = await tx.insert(voiceExamAttempts).values({
      user_id: userId,
      card_id: cardId,
      card_updated_at: card.cardUpdatedAt,
      schedule_reps: card.reps,
      schedule_last_review: card.lastReview,
      ticket_hash: hashTicket(ticket),
      ticket_expires_at: new Date(now.getTime() + TICKET_LIFETIME_MS),
      expires_at: new Date(now.getTime() + ATTEMPT_LIFETIME_MS),
      live_model: LIVE_MODEL,
      grading_model: VOICE_GRADING_MODEL,
    }).returning({ id: voiceExamAttempts.id, ticket_expires_at: voiceExamAttempts.ticket_expires_at });
    return created;
  });

  return { attempt_id: attempt.id, ticket, ws_url: wsUrl, ticket_expires_at: attempt.ticket_expires_at };
}

export async function consumeVoiceTicket(ticket: string): Promise<{
  attempt_id: string;
  front: string;
  subject: string;
}> {
  const now = new Date();
  const [attempt] = await db.update(voiceExamAttempts)
    .set({ ticket_hash: null, status: 'active' })
    .where(and(
      eq(voiceExamAttempts.ticket_hash, hashTicket(ticket)),
      eq(voiceExamAttempts.status, 'created'),
      gt(voiceExamAttempts.ticket_expires_at, now),
      gt(voiceExamAttempts.expires_at, now),
    )).returning({ id: voiceExamAttempts.id, cardId: voiceExamAttempts.card_id });
  if (!attempt) throw new ServiceError('FORBIDDEN', 'Invalid or expired voice ticket');

  const [card] = await db.select({ front: cards.front, subject: decks.subject })
    .from(cards).innerJoin(decks, eq(decks.id, cards.deck_id))
    .where(eq(cards.id, attempt.cardId));
  if (!card) throw new ServiceError('NOT_FOUND', 'Card not found');
  return { attempt_id: attempt.id, front: card.front, subject: card.subject };
}

export async function getVoiceAttempt(userId: string, attemptId: string): Promise<{
  attempt_id: string;
  status: string;
  transcript: string | null;
  rating: 'again' | 'hard' | 'good' | 'easy' | null;
  feedback: string | null;
  skill_used: string | null;
  scheduled_days: number | null;
  due_date: Date | null;
}> {
  const [attempt] = await db.select().from(voiceExamAttempts)
    .where(and(eq(voiceExamAttempts.id, attemptId), eq(voiceExamAttempts.user_id, userId)));
  if (!attempt) throw new ServiceError('NOT_FOUND', 'Voice attempt not found');
  return {
    attempt_id: attempt.id,
    status: attempt.status,
    transcript: attempt.transcript,
    rating: attempt.rating,
    feedback: attempt.feedback,
    skill_used: attempt.skill_used,
    scheduled_days: attempt.scheduled_days,
    due_date: attempt.due_date,
  };
}

export async function abortVoiceAttempt(userId: string, attemptId: string): Promise<void> {
  await db.update(voiceExamAttempts).set({ status: 'aborted', ticket_hash: null, completed_at: new Date() })
    .where(and(
      eq(voiceExamAttempts.id, attemptId),
      eq(voiceExamAttempts.user_id, userId),
      inArray(voiceExamAttempts.status, ['created', 'active', 'grading']),
    ));
}

export async function abortVoiceAttemptByService(attemptId: string): Promise<void> {
  await db.update(voiceExamAttempts).set({ status: 'aborted', ticket_hash: null, completed_at: new Date() })
    .where(and(
      eq(voiceExamAttempts.id, attemptId),
      inArray(voiceExamAttempts.status, ['created', 'active', 'grading']),
    ));
}

export async function finishVoiceAttempt(attemptId: string, transcript: string): Promise<Awaited<ReturnType<typeof getVoiceAttempt>>> {
  const [attempt] = await db.select().from(voiceExamAttempts)
    .where(eq(voiceExamAttempts.id, attemptId));
  if (!attempt) throw new ServiceError('NOT_FOUND', 'Voice attempt not found');
  if (attempt.status === 'graded' || attempt.status === 'unassessable') {
    return getVoiceAttempt(attempt.user_id, attemptId);
  }
  if (attempt.status === 'grading') {
    throw new ServiceError('UNAVAILABLE', 'Voice exam is already being evaluated');
  }
  if (attempt.status !== 'active' || attempt.expires_at <= new Date()) {
    throw new ServiceError('FORBIDDEN', 'Voice attempt expired or inactive');
  }

  const [claimed] = await db.update(voiceExamAttempts).set({ status: 'grading' })
    .where(and(eq(voiceExamAttempts.id, attemptId), eq(voiceExamAttempts.status, 'active')))
    .returning({ id: voiceExamAttempts.id });
  if (!claimed) {
    const current = await getVoiceAttempt(attempt.user_id, attemptId);
    if (current.status === 'graded' || current.status === 'unassessable') return current;
    throw new ServiceError('UNAVAILABLE', 'Voice exam is already being evaluated');
  }

  try {
    const [card] = await db.select({
      front: cards.front,
      back: cards.back,
      subject: decks.subject,
      updatedAt: cards.updated_at,
    }).from(cards).innerJoin(decks, eq(decks.id, cards.deck_id))
      .where(eq(cards.id, attempt.card_id));
    if (!card) throw new ServiceError('NOT_FOUND', 'Card not found');
    if (card.updatedAt.getTime() !== attempt.card_updated_at.getTime()) {
      throw new ServiceError('FORBIDDEN', 'Card changed during the voice exam');
    }

    const skills = await listSkills(attempt.user_id);
    const grade = await gradeVoiceAnswer({ front: card.front, back: card.back, subject: card.subject, skills, transcript });

    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(voiceExamAttempts)
        .where(eq(voiceExamAttempts.id, attemptId)).for('update');
      if (!locked || locked.status === 'graded' || locked.status === 'unassessable') return;
      if (locked.status !== 'grading' || locked.expires_at <= new Date()) {
        throw new ServiceError('FORBIDDEN', 'Voice attempt expired or inactive');
      }

      const [currentCard] = await tx.select({ updatedAt: cards.updated_at })
        .from(cards).where(eq(cards.id, locked.card_id)).for('update');
      if (!currentCard || currentCard.updatedAt.getTime() !== locked.card_updated_at.getTime()) {
        throw new ServiceError('FORBIDDEN', 'Card changed during the voice exam');
      }

      if (!grade.assessable || !grade.rating) {
        await tx.update(voiceExamAttempts).set({
          status: 'unassessable', transcript, feedback: grade.feedback,
          skill_used: grade.skillUsed, grading_model: grade.modelUsed, completed_at: new Date(),
        }).where(eq(voiceExamAttempts.id, attemptId));
        return;
      }

      const result = await applyReview(tx, locked.user_id, locked.card_id, grade.rating, {
        reps: locked.schedule_reps,
        lastReview: locked.schedule_last_review,
      });
      await tx.update(voiceExamAttempts).set({
        status: 'graded', transcript, rating: grade.rating, feedback: grade.feedback,
        skill_used: grade.skillUsed, review_log_id: result.review_log_id,
        grading_model: grade.modelUsed,
        scheduled_days: result.scheduled_days, due_date: result.due_date,
        completed_at: new Date(),
      }).where(eq(voiceExamAttempts.id, attemptId));
    });

    return getVoiceAttempt(attempt.user_id, attemptId);
  } catch (error) {
    await db.update(voiceExamAttempts).set({ status: 'active' })
      .where(and(eq(voiceExamAttempts.id, attemptId), eq(voiceExamAttempts.status, 'grading')));
    throw error;
  }
}

export async function purgeOldVoiceTranscripts(now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - 30 * 86_400_000);
  await db.update(voiceExamAttempts).set({ transcript: null })
    .where(and(lt(voiceExamAttempts.created_at, cutoff), isNotNull(voiceExamAttempts.transcript)));
}
