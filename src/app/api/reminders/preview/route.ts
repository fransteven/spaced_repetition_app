import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getBucketPreview } from '@/lib/services/reminder-service';
import { ServiceError } from '@/lib/services/service-error';

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get('deckId');

  if (!deckId) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'deckId is required' } },
      { status: 400 }
    );
  }

  try {
    const result = await getBucketPreview(session.user.id, deckId);
    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[GET /api/reminders/preview]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch bucket preview' } },
      { status: 500 }
    );
  }
}
