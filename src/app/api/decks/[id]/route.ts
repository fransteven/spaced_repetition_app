import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UpdateDeckSchema } from '@/lib/validations';
import {
  deleteDeckForUser,
  getDeckDetailForUser,
  updateDeckForUser,
} from '@/lib/services/deck-service';
import { ServiceError } from '@/lib/services/service-error';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const result = await getDeckDetailForUser(session.user.id, id);

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof ServiceError && error.code === 'NOT_FOUND') {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: error.message } },
        { status: 404 }
      );
    }

    console.error('[GET /api/decks/[id]]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch deck' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateDeckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 }
    );
  }

  try {
    const updated = await updateDeckForUser(session.user.id, id, parsed.data);

    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[PATCH /api/decks/[id]]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to update deck' } },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    await deleteDeckForUser(session.user.id, id);

    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[DELETE /api/decks/[id]]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete deck' } },
      { status: 500 }
    );
  }
}
