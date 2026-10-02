import { GoogleGenAI, type Schema } from '@google/genai';
import type { z } from 'zod';
import { ServiceError } from '@/lib/services/service-error';

/**
 * Server-only Gemini helpers for the reader: short structured calls
 * (translation, card suggestions, book Q&A) and embeddings for retrieval.
 * Generation tries each model in order; the output is validated with Zod
 * before it is trusted.
 */

const MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3-flash-preview'] as const;
const ATTEMPTS_PER_MODEL = 1; // interactive calls: fail over fast instead of waiting on one model
const RETRY_DELAY_MS = 400;
const TIMEOUT_MS = 20_000;

function isTransient(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  // A hung model hits our timeout (AbortError): try the next one.
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) return true;
  const status = 'status' in error ? error.status : undefined;
  const code = 'code' in error ? error.code : undefined;
  return [503, 429, 404, 'UNAVAILABLE', 'RESOURCE_EXHAUSTED', 'NOT_FOUND'].some(
    (value) => value === status || value === code
  );
}

function client(context: string, timeoutMs: number): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(`[${context}] GEMINI_API_KEY is not set`);
    throw new ServiceError('UNAVAILABLE', 'AI features are not configured');
  }
  return new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } });
}

export async function generateStructured<S extends z.ZodType>(input: {
  context: string;
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  outputSchema: S;
  timeoutMs?: number;
}): Promise<z.infer<S>> {
  const ai = client(input.context, input.timeoutMs ?? TIMEOUT_MS);
  let lastError: unknown;

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
          config: {
            systemInstruction: input.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: input.responseSchema,
            temperature: 0.2,
          },
        });
        const raw = response.text;
        if (!raw) throw new Error('Empty model response');
        const parsed = input.outputSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) throw new Error(`Invalid model output: ${parsed.error.message}`);
        return parsed.data;
      } catch (error) {
        lastError = error;
        if (!isTransient(error)) {
          console.error(`[${input.context}] ${model}`, error);
          throw new ServiceError('UNAVAILABLE', 'The AI service failed. Try again.');
        }
        if (attempt < ATTEMPTS_PER_MODEL) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        }
      }
    }
  }

  console.error(`[${input.context}] all models exhausted`, lastError);
  throw new ServiceError('UNAVAILABLE', 'The AI service is busy. Try again in a moment.');
}

// ── Embeddings ───────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_BATCH = 100; // batchEmbedContents limit
const EMBEDDING_ATTEMPTS = 4;

/** Below 3072 dims gemini-embedding-001 returns unnormalized vectors. */
function normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return norm > 0 ? values.map((value) => value / norm) : values;
}

/**
 * Embeds texts in batches. Documents and queries use different task types so
 * the retrieval space is asymmetric, as the model expects.
 */
export async function embedTexts(input: {
  context: string;
  texts: string[];
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';
  dimensions: number;
}): Promise<number[][]> {
  const ai = client(input.context, 60_000);
  const vectors: number[][] = [];

  for (let start = 0; start < input.texts.length; start += EMBEDDING_BATCH) {
    const batch = input.texts.slice(start, start + EMBEDDING_BATCH);
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: batch,
          config: { taskType: input.taskType, outputDimensionality: input.dimensions },
        });
        const values = (response.embeddings ?? []).map((embedding) => embedding.values ?? []);
        if (values.length !== batch.length || values.some((vector) => vector.length !== input.dimensions)) {
          throw new Error(`Unexpected embedding response (${values.length}/${batch.length})`);
        }
        vectors.push(...values.map(normalize));
        break;
      } catch (error) {
        if (!isTransient(error) || attempt >= EMBEDDING_ATTEMPTS) {
          console.error(`[${input.context}] embeddings`, error);
          throw new ServiceError('UNAVAILABLE', 'The AI service is busy. Try again in a moment.');
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
      }
    }
  }

  return vectors;
}
