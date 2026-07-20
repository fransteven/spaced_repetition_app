import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { GoogleGenAI, Type, type GenerateContentResponse } from '@google/genai';
import { db } from '@/lib/db';
import { cards, decks } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';
import { assertCardOwnership } from '@/lib/services/card-service';
import { listSkills } from '@/lib/services/skill-service';
import type { FsrsRating } from '@/lib/fsrs/types';

// Tried in order. flash is faster/cheaper; pro is the fallback when flash
// is overloaded (503 UNAVAILABLE) or otherwise unavailable. Gemini-only —
// do not add other providers here.
const EXAM_MODELS = ['gemini-3-flash-preview', 'gemini-3-pro-preview'] as const;

const MAX_ATTEMPTS_PER_MODEL = 3;
const RETRY_BASE_DELAY_MS    = 500;

// Google's SDK throws an ApiError shaped like { status, message } (and often
// an embedded { error: { code, status, message } } payload) rather than a
// typed class we can import, so narrow with a guard instead of `any`/`as`.
function getApiErrorStatus(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const record = err as Record<string, unknown>;
  if (typeof record.status === 'string') return record.status;
  const nested = record.error;
  if (typeof nested === 'object' && nested !== null) {
    const status = (nested as Record<string, unknown>).status;
    if (typeof status === 'string') return status;
  }
  return undefined;
}

function isRetryableError(err: unknown): boolean {
  const status = getApiErrorStatus(err);
  return status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED' || status === 'NOT_FOUND';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tries each model in EXAM_MODELS in order; within a model, retries
// transient failures (overload/quota/model-unavailable) with exponential
// backoff before falling through to the next model. Non-retryable errors
// (auth, bad request, etc.) abort immediately.
async function generateWithFallback(
  ai: GoogleGenAI,
  contents: { role: string; parts: { text: string }[] }[],
  systemInstruction: string,
): Promise<GenerateContentResponse> {
  let lastError: unknown;

  for (const model of EXAM_MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema:   RESPONSE_SCHEMA,
          },
        });
      } catch (err) {
        lastError = err;
        if (!isRetryableError(err)) throw err;
        if (attempt < MAX_ATTEMPTS_PER_MODEL) {
          const jitter = Math.random() * 250;
          await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + jitter);
        }
      }
    }
    // Exhausted retries for this model — fall through to the next one.
  }

  console.error('[exam-service] All Gemini models exhausted', lastError);
  throw new ServiceError('UNAVAILABLE', 'El examinador está congestionado. Intenta de nuevo en un momento.');
}

export interface ExamMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface ExamVerdict {
  rating:    FsrsRating;
  feedback:  string;
  skillUsed: string;
}

export interface ExamTurnResult {
  message: string;
  done:    boolean;
  verdict: ExamVerdict | null;
}

// Validates the model's structured JSON output before we trust it.
const ExamModelOutputSchema = z.object({
  message: z.string(),
  done:    z.boolean(),
  verdict: z
    .object({
      rating:    z.enum(['again', 'hard', 'good', 'easy']),
      feedback:  z.string(),
      skillUsed: z.string(),
    })
    .nullable()
    .optional(),
});

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    message: {
      type: Type.STRING,
      description: 'What to show the student next: either the exercise prompt, or your feedback.',
    },
    done: {
      type: Type.BOOLEAN,
      description: 'true only once you have graded the student answer and are emitting a final verdict.',
    },
    verdict: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        rating: {
          type: Type.STRING,
          enum: ['again', 'hard', 'good', 'easy'],
          description:
            'FSRS rating for this card based on how well the student demonstrated recall: ' +
            'again = failed, hard = struggled, good = succeeded, easy = effortless.',
        },
        feedback:  { type: Type.STRING, description: 'One or two sentences of feedback for the student.' },
        skillUsed: { type: Type.STRING, description: 'Name of the skill you used to write the exercise.' },
      },
      required: ['rating', 'feedback', 'skillUsed'],
    },
  },
  required: ['message', 'done'],
};

function buildSystemInstruction(
  front: string,
  back: string,
  subject: string,
  skills: { name: string; topic: string; rubric: string }[],
): string {
  const skillList = skills
    .map((s) => `- ${s.name} (${s.topic}): ${s.rubric}`)
    .join('\n');

  return [
    'You are a strict but encouraging tutor running a spoken-style oral exam on ONE flashcard.',
    'This is retrieval practice: the goal is to make the student actively produce knowledge, not recognize it.',
    '',
    `Deck subject: ${subject}`,
    `Card question (front): ${front}`,
    `Card answer (back): ${back}`,
    '',
    'Available skills — pick the single best match for this card, do not mix skills:',
    skillList,
    '',
    'Turn 1: infer the best-fit skill and ask ONE short exercise that requires the student to actively',
    'use or produce the knowledge from the card (per that skill\'s rubric). Set done=false, verdict=null.',
    'Turn 2 (after the student answers): grade the answer against the card\'s answer and the skill rubric.',
    'Set done=true and fill verdict with an honest rating — do not inflate the rating to be nice.',
    'Never reveal the literal card answer text before the student has attempted the exercise.',
    'Keep every message concise (2-4 sentences).',
  ].join('\n');
}

export async function runExamTurn(
  userId:  string,
  cardId:  string,
  history: ExamMessage[],
): Promise<ExamTurnResult> {
  await assertCardOwnership(userId, cardId);

  const [row] = await db
    .select({
      front:   cards.front,
      back:    cards.back,
      subject: decks.subject,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deck_id))
    .where(eq(cards.id, cardId));

  if (!row) {
    throw new ServiceError('NOT_FOUND', 'Card not found');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Server misconfiguration — never leak this detail to the client.
    console.error('[exam-service] GEMINI_API_KEY is not set');
    throw new Error('Exam service is not configured');
  }

  const skills = await listSkills(userId);
  const systemInstruction = buildSystemInstruction(row.front, row.back, row.subject, skills);

  const contents = history.length === 0
    ? [{ role: 'user', parts: [{ text: 'Begin the exam.' }] }]
    : history.map((m) => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

  const ai = new GoogleGenAI({ apiKey });

  const response = await generateWithFallback(ai, contents, systemInstruction);

  const raw = response.text;
  if (!raw) {
    throw new Error('Exam model returned an empty response');
  }

  const parsed = ExamModelOutputSchema.parse(JSON.parse(raw));

  return {
    message: parsed.message,
    done:    parsed.done,
    verdict: parsed.verdict ?? null,
  };
}
