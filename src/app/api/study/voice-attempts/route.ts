import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { StartVoiceAttemptSchema } from '@/lib/validations';
import { startVoiceAttempt } from '@/lib/services/voice-attempt-service';
import { ServiceError } from '@/lib/services/service-error';

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(
    { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 }
  );

  const parsed = StartVoiceAttemptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(
    { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 }
  );

  try {
    const data = await startVoiceAttempt(session.user.id, parsed.data.card_id);
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'UNAVAILABLE' ? 503 : 403;
      return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status });
    }
    console.error('[POST /api/study/voice-attempts]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to start voice exam' } }, { status: 500 }
    );
  }
}
