import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteSkill } from '@/lib/services/skill-service';
import { ServiceError } from '@/lib/services/service-error';

type Params = { params: Promise<{ id: string }> };

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
    await deleteSkill(session.user.id, id);

    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { code: error.code, message: error.message } },
        { status: error.code === 'NOT_FOUND' ? 404 : 403 }
      );
    }

    console.error('[DELETE /api/skills/[id]]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete skill' } },
      { status: 500 }
    );
  }
}
