import { timingSafeEqual } from 'node:crypto';
import type { NextResponse } from 'next/server';
import { fail } from '@/lib/api-response';

/**
 * Bearer-token check for service-to-service routes (`/api/internal/*`). Each external service has
 * its own shared secret so a leak of one never opens the other.
 */
export type ServiceTokenName = 'LLM_SERVICE_TOKEN' | 'VOICE_SERVICE_TOKEN';

// The LLM secret must be strong; the voice secret keeps its original (any non-empty) rule.
const MIN_SECRET_LENGTH: Record<ServiceTokenName, number> = {
  LLM_SERVICE_TOKEN: 32,
  VOICE_SERVICE_TOKEN: 1,
};

export function isInternalServiceRequest(
  request: Request,
  tokenName: ServiceTokenName = 'LLM_SERVICE_TOKEN'
): boolean {
  const secret = process.env[tokenName];
  const authorization = request.headers.get('authorization');
  if (!secret || secret.length < MIN_SECRET_LENGTH[tokenName] || !authorization?.startsWith('Bearer ')) {
    return false;
  }
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/** Returns the 401 envelope for unauthenticated callers, or null when the request may proceed. */
export function rejectUnlessInternal(request: Request): NextResponse | null {
  return isInternalServiceRequest(request) ? null : fail('UNAUTHORIZED', 'Invalid service credentials');
}
