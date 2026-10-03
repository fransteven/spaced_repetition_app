import { z } from 'zod';
import { ServiceError } from '@/lib/services/service-error';

/**
 * Waits for a service that sleeps when idle. Free hosting (Render's free plan, for one) stops a service after
 * 15 minutes without traffic and needs 30-60 s to start it again. Waiting here, against `GET /health` and with
 * its own budget, keeps that cold start out of the time limit of the real request.
 */

const DEFAULT_WAKE_TIMEOUT_MS = 90_000;
const RETRY_DELAY_MS = 2_000;
// Render stops a free service after 15 minutes without inbound traffic; probe again well before that.
const AWAKE_TTL_MS = 10 * 60_000;
const STARTING_MESSAGE = 'The service is still starting up. Try again in a minute.';

const HealthSchema = z.object({ status: z.literal('ok') });

// Per server instance: a service that answered recently is not probed again.
const awakeUntil = new Map<string, number>();
const probing = new Map<string, Promise<void>>();

/** How long to wait for a sleeping service (`LLM_WAKE_TIMEOUT_MS`); 0 turns the wait off for an always-on host. */
function wakeTimeoutMs(): number {
  const configured = Number(process.env.LLM_WAKE_TIMEOUT_MS ?? DEFAULT_WAKE_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_WAKE_TIMEOUT_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function markServiceAwake(origin: string): void {
  awakeUntil.set(origin, Date.now() + AWAKE_TTL_MS);
}

export function markServiceAsleep(origin: string): void {
  awakeUntil.delete(origin);
}

async function probe(origin: string, deadline: number): Promise<void> {
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new ServiceError('UNAVAILABLE', STARTING_MESSAGE);
    try {
      // A sleeping host holds the request until the app is up, or answers 5xx / its own HTML page meanwhile.
      const response = await fetch(`${origin}/health`, { signal: AbortSignal.timeout(remaining), cache: 'no-store' });
      const body: unknown = response.ok ? await response.json().catch(() => null) : null;
      if (HealthSchema.safeParse(body).success) {
        markServiceAwake(origin);
        return;
      }
    } catch {
      // Connection refused or reset while the host boots: try again.
    }
    await sleep(Math.min(RETRY_DELAY_MS, Math.max(0, deadline - Date.now())));
  }
}

/** Resolves once the service at `origin` answers `/health`; rejects with UNAVAILABLE when it does not in time. */
export async function wakeService(origin: string): Promise<void> {
  const timeout = wakeTimeoutMs();
  if (timeout === 0 || (awakeUntil.get(origin) ?? 0) > Date.now()) return;

  const running = probing.get(origin);
  if (running) return running;

  const startedAt = Date.now();
  const wake = probe(origin, startedAt + timeout)
    .then(() => {
      const waited = Date.now() - startedAt;
      if (waited > 2_000) console.info(`[service-wake] ${new URL(origin).host} answered after ${Math.round(waited / 1000)} s`);
    })
    .finally(() => probing.delete(origin));
  probing.set(origin, wake);
  return wake;
}
