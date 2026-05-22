import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  CreateReminderProgramSchema,
} from '@/lib/validations';
import {
  listProgramsForUser,
  createProgramForUser,
} from '@/lib/services/reminder-service';
import { ServiceError } from '@/lib/services/service-error';

export async function GET(): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  try {
    const result = await listProgramsForUser(session.user.id);
    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    console.error('[GET /api/reminders]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reminders' } },
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
  const parsed = CreateReminderProgramSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 }
    );
  }

  try {
    const program = await createProgramForUser(session.user.id, parsed.data);
    return NextResponse.json({ data: program, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[POST /api/reminders]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create reminder program' } },
      { status: 500 }
    );
  }
}
