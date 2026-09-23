import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isVoiceServiceRequest } from '@/lib/voice-service-auth';
import { consumeVoiceTicket } from '@/lib/services/voice-attempt-service';
import { ServiceError } from '@/lib/services/service-error';

const Schema = z.object({ ticket: z.string().min(20).max(200) });

export async function POST(request: Request): Promise<NextResponse> {
  if (!isVoiceServiceRequest(request)) return NextResponse.json(
    { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid service credentials' } }, { status: 401 }
  );
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(
    { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 }
  );
  try {
    const data = await consumeVoiceTicket(parsed.data.ticket);
    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof ServiceError) return NextResponse.json(
      { data: null, error: { code: error.code, message: error.message } }, { status: 403 }
    );
    console.error('[POST /api/internal/voice/consume]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to start voice connection' } }, { status: 500 }
    );
  }
}
