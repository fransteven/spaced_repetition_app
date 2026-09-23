import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isVoiceServiceRequest } from '@/lib/voice-service-auth';
import { abortVoiceAttemptByService } from '@/lib/services/voice-attempt-service';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  if (!isVoiceServiceRequest(request)) return NextResponse.json(
    { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid service credentials' } }, { status: 401 }
  );
  const parsed = z.string().uuid().safeParse((await context.params).id);
  if (!parsed.success) return NextResponse.json(
    { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid attempt ID' } }, { status: 400 }
  );
  try {
    await abortVoiceAttemptByService(parsed.data);
    return NextResponse.json({ data: { aborted: true }, error: null });
  } catch (error) {
    console.error('[POST /api/internal/voice/attempts/[id]/abort]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to close voice exam' } }, { status: 500 }
    );
  }
}
