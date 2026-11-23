import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SubmitReviewSchema } from '@/lib/validations';
import { submitReview } from '@/lib/services/study-service';
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
  const parsed = SubmitReviewSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[POST /api/study/review] invalid body', parsed.error.issues);
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid review request' } },
      { status: 400 },
    );
  }

  try {
    // userId always from session — never from body (AGENTS.md §10.8)
    const result = await submitReview(
      session.user.id,
      parsed.data.card_id,
      parsed.data.rating,
      parsed.data.client_review_id,
    );
    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 },
      );
    }
    console.error('[POST /api/study/review]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to submit review' } },
      { status: 500 },
    );
  }
}
