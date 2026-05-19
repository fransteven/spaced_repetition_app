import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CreateCardSchema } from '@/lib/validations';
import { createCardForUser, listCardsForDeck } from '@/lib/services/card-service';
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
    const result = await listCardsForDeck(session.user.id, deckId);

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[GET /api/cards]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch cards' } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = CreateCardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 }
    );
  }

  try {
    const card = await createCardForUser(session.user.id, parsed.data);

    return NextResponse.json({ data: card, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[POST /api/cards]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create card' } },
      { status: 500 }
    );
  }
}
