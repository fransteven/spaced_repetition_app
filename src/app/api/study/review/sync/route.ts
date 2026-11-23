import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SyncOfflineReviewsSchema } from '@/lib/validations';
import { syncOfflineReviews } from '@/lib/services/study-service';

// Up to 500 reviews, one transaction each.
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = SyncOfflineReviewsSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[POST /api/study/review/sync] invalid body', parsed.error.issues);
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid sync request' } },
      { status: 400 },
    );
  }

  try {
    // userId always from session — never from body (AGENTS.md §10.8)
    const result = await syncOfflineReviews(session.user.id, parsed.data.reviews);
    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    console.error('[POST /api/study/review/sync]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync reviews' } },
      { status: 500 },
    );
  }
}
