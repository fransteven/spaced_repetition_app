import { z } from 'zod';
import { ServiceError } from '@/lib/services/service-error';

/**
 * Server-only client for srs-llm-api (FastAPI + LangGraph + OpenAI). The OpenAI key lives in that
 * service; this app only holds the shared service token.
 */

const DEFAULT_TIMEOUT_MS = 30_000;

export interface LlmServiceConfig {
  baseUrl: string;
  token: string;
}

/** Connection details for the service; throws UNAVAILABLE when it is not configured. */
export function getLlmServiceConfig(): LlmServiceConfig {
  const baseUrl = process.env.LLM_API_URL?.replace(/\/+$/, '');
  const token = process.env.LLM_SERVICE_TOKEN;
  if (!baseUrl || !/^https?:\/\//.test(baseUrl) || !token || token.length < 32) {
    console.error('[llm-client] LLM_API_URL / LLM_SERVICE_TOKEN are not configured');
    throw new ServiceError('UNAVAILABLE', 'The AI service is not configured');
  }
  return { baseUrl, token };
}

const EnvelopeSchema = z.object({
  data: z.unknown(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
});

const GENERIC_FAILURE = 'The AI service failed. Try again in a moment.';

/** POSTs JSON to the service and returns the envelope's `data`, validated against `schema`. */
export async function callLlmService<S extends z.ZodType>(
  path: string,
  body: unknown,
  schema: S,
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<z.infer<S>> {
  const { baseUrl, token } = getLlmServiceConfig();
  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
  } catch (error) {
    console.error(`[llm-client] ${path} unreachable`, error);
    throw new ServiceError('UNAVAILABLE', 'The AI service is unreachable. Try again in a moment.');
  }

  const envelope = EnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!envelope.success) {
    console.error(`[llm-client] ${path} returned a non-envelope response (HTTP ${response.status})`);
    throw new ServiceError('UNAVAILABLE', GENERIC_FAILURE);
  }
  if (envelope.data.error || !response.ok) {
    const code = envelope.data.error?.code ?? 'ERROR';
    console.error(`[llm-client] ${path} failed: HTTP ${response.status} ${code}`);
    // Only the service's own UNAVAILABLE messages are written for end users.
    throw new ServiceError('UNAVAILABLE', code === 'UNAVAILABLE' && envelope.data.error ? envelope.data.error.message : GENERIC_FAILURE);
  }

  const data = schema.safeParse(envelope.data.data);
  if (!data.success) {
    console.error(`[llm-client] ${path} returned unexpected data`, data.error.message);
    throw new ServiceError('UNAVAILABLE', GENERIC_FAILURE);
  }
  return data.data;
}
