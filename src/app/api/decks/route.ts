import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CreateDeckSchema } from '@/lib/validations';
import { createDeckForUser, listDecksForUser } from '@/lib/services/deck-service';

export async function GET(): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  try {
    const result = await listDecksForUser(session.user.id);

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    console.error('[GET /api/decks]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch decks' } },
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
  const parsed = CreateDeckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 }
    );
  }

  try {
    const deck = await createDeckForUser(session.user.id, parsed.data);

    return NextResponse.json({ data: deck, error: null }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/decks]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create deck' } },
      { status: 500 }
    );
  }
}
