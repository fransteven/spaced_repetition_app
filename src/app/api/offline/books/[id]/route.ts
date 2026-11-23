import type { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOfflineBookSnapshot } from '@/lib/services/offline-service';
import { fail, failFromError, ok } from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');

  const { id } = await params;
  try {
    const response = ok(await getOfflineBookSnapshot(session.user.id, id));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return failFromError(error, '[GET /api/offline/books/[id]]', 'Failed to load book');
  }
}
