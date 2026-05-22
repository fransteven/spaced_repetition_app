import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ToggleReminderProgramSchema } from '@/lib/validations';
import {
  toggleProgramActive,
  deleteProgramForUser,
} from '@/lib/services/reminder-service';
import { ServiceError } from '@/lib/services/service-error';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(
  request: Request,
  { params }: Params
): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = ToggleReminderProgramSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 }
    );
  }

  try {
    const updated = await toggleProgramActive(
      session.user.id,
      id,
      parsed.data.active
    );
    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[PATCH /api/reminders/[id]]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to update reminder program' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: Params
): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    await deleteProgramForUser(session.user.id, id);
    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[DELETE /api/reminders/[id]]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete reminder program' } },
      { status: 500 }
    );
  }
}
