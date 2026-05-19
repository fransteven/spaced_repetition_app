import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UpdateCardSchema } from '@/lib/validations';
import { deleteCardForUser, updateCardForUser } from '@/lib/services/card-service';
import { ServiceError } from '@/lib/services/service-error';

type Params = { params: Promise<{ id: string }> };

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
  const parsed = UpdateCardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 }
    );
  }

  try {
    const updated = await updateCardForUser(session.user.id, id, parsed.data);

    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[PATCH /api/cards/[id]]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to update card' } },
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
    await deleteCardForUser(session.user.id, id);

    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[DELETE /api/cards/[id]]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete card' } },
      { status: 500 }
    );
  }
}
