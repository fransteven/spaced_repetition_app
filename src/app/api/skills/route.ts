import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CreateSkillSchema } from '@/lib/validations';
import { listSkills, createSkill } from '@/lib/services/skill-service';

export async function GET(): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  try {
    const skills = await listSkills(session.user.id);
    return NextResponse.json({ data: skills, error: null });
  } catch (error) {
    console.error('[GET /api/skills]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to load skills' } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  const body   = await request.json();
  const parsed = CreateSkillSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    // userId always from session — never from body (AGENTS.md §10.8)
    const skill = await createSkill(session.user.id, parsed.data);
    return NextResponse.json({ data: skill, error: null }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/skills]', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create skill' } },
      { status: 500 },
    );
  }
}
