import { GoogleGenAI, type Schema } from '@google/genai';
import type { z } from 'zod';
import { ServiceError } from '@/lib/services/service-error';

/**
 * Server-only Gemini helper for the reader's short structured calls (translation and
 * card suggestions; moving to srs-llm-api). It tries each model in order and validates
 * the output with Zod before it is trusted.
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
