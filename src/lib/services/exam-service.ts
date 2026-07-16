import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from '@/lib/db';
import { cards, decks } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';
import { assertCardOwnership } from '@/lib/services/card-service';
import { listSkills } from '@/lib/services/skill-service';
import type { FsrsRating } from '@/lib/fsrs/types';

const EXAM_MODEL = 'gemini-3-flash-preview';

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

  const response = await ai.models.generateContent({
    model: EXAM_MODEL,
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema:   RESPONSE_SCHEMA,
    },
  });

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
