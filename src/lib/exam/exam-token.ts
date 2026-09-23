import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ServiceError } from '@/lib/services/service-error';

const PayloadSchema = z.object({
  userId: z.string().uuid(),
  cardId: z.string().uuid(),
  reps: z.number().int().nonnegative(),
  lastReview: z.string().datetime().nullable(),
  cardUpdatedAt: z.string().datetime(),
  expiresAt: z.number().int(),
});

export type ExamTokenPayload = z.infer<typeof PayloadSchema>;

function signingKey(): string {
  const key = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!key) throw new Error('Auth signing secret is not configured');
  return key;
}

export function signExamToken(payload: ExamTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(PayloadSchema.parse(payload))).toString('base64url');
  const signature = createHmac('sha256', signingKey()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyExamToken(token: string, userId: string, cardId: string): ExamTokenPayload {
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) throw new ServiceError('FORBIDDEN', 'Invalid exam token');
  const expected = createHmac('sha256', signingKey()).update(encoded).digest();
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new ServiceError('FORBIDDEN', 'Invalid exam token');
  }
  let decoded: unknown;
  try { decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); }
  catch { throw new ServiceError('FORBIDDEN', 'Invalid exam token'); }
  const payload = PayloadSchema.safeParse(decoded);
  if (!payload.success || payload.data.userId !== userId || payload.data.cardId !== cardId || payload.data.expiresAt < Date.now()) {
    throw new ServiceError('FORBIDDEN', 'Expired or mismatched exam token');
  }
  return payload.data;
}
