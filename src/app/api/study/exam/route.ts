import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SubmitExamTurnSchema } from '@/lib/validations';
import { runExamTurn } from '@/lib/services/exam-service';
import { ServiceError } from '@/lib/services/service-error';

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  const body   = await request.json();
  const parsed = SubmitExamTurnSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    // userId always from session — never from body (AGENTS.md §10.8)
    const result = await runExamTurn(session.user.id, parsed.data.card_id, parsed.data.messages);
    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 },
      );
    }
    console.error('[POST /api/study/exam]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to run exam turn' } },
      { status: 500 },
    );
  }
}
