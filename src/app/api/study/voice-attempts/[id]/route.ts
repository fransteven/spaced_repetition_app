import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { abortVoiceAttempt, getVoiceAttempt } from '@/lib/services/voice-attempt-service';
import { ServiceError } from '@/lib/services/service-error';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(
    { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 }
  );
  const parsed = z.string().uuid().safeParse((await context.params).id);
  if (!parsed.success) return NextResponse.json(
    { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid attempt ID' } }, { status: 400 }
  );
  try {
    const data = await getVoiceAttempt(session.user.id, parsed.data);
    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof ServiceError) return NextResponse.json(
      { data: null, error: { code: error.code, message: error.message } }, { status: 404 }
    );
    console.error('[GET /api/study/voice-attempts/[id]]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to read voice exam' } }, { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(
    { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 }
  );
  const parsed = z.string().uuid().safeParse((await context.params).id);
  if (!parsed.success) return NextResponse.json(
    { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid attempt ID' } }, { status: 400 }
  );
  try {
    await abortVoiceAttempt(session.user.id, parsed.data);
    return NextResponse.json({ data: { aborted: true }, error: null });
  } catch (error) {
    console.error('[DELETE /api/study/voice-attempts/[id]]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to close voice exam' } }, { status: 500 }
    );
  }
}
