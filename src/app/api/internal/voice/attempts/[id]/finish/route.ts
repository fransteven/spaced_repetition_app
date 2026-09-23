import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isVoiceServiceRequest } from '@/lib/voice-service-auth';
import { FinishVoiceAttemptSchema } from '@/lib/validations';
import { finishVoiceAttempt } from '@/lib/services/voice-attempt-service';
import { ServiceError } from '@/lib/services/service-error';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  if (!isVoiceServiceRequest(request)) return NextResponse.json(
    { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid service credentials' } }, { status: 401 }
  );
  const attemptId = z.string().uuid().safeParse((await context.params).id);
  const parsed = FinishVoiceAttemptSchema.safeParse(await request.json().catch(() => null));
  if (!attemptId.success || !parsed.success) return NextResponse.json(
    { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid voice exam result' } }, { status: 400 }
  );
  try {
    const data = await finishVoiceAttempt(attemptId.data, parsed.data.transcript);
    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'UNAVAILABLE' ? 503 : 403;
      return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status });
    }
    console.error('[POST /api/internal/voice/attempts/[id]/finish]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to grade voice exam' } }, { status: 500 }
    );
  }
}
