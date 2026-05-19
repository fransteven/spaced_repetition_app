import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { RegisterSchema } from '@/lib/validations';

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Email already registered' } },
        { status: 409 },
      );
    }

    const hash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({ name, email, password: hash })
      .returning({ id: users.id, email: users.email, name: users.name });

    return NextResponse.json({ data: user, error: null }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/register]', e);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create account' } },
      { status: 500 },
    );
  }
}
