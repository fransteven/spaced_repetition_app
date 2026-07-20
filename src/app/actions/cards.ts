'use server';

import { auth } from '@/lib/auth';
import { CreateCardSchema, UpdateCardSchema } from '@/lib/validations';
import { createCardForUser, updateCardForUser } from '@/lib/services/card-service';
import { ServiceError } from '@/lib/services/service-error';

interface ActionError {
  code: 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'UNAVAILABLE' | 'INTERNAL_ERROR';
  message: string;
}

interface ActionResult<T> {
  data: T | null;
  error: ActionError | null;
}

export async function createCardAction(
  input: unknown
): Promise<ActionResult<Awaited<ReturnType<typeof createCardForUser>>>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
    };
  }

  const parsed = CreateCardSchema.safeParse(input);

  if (!parsed.success) {
    return {
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    };
  }

  try {
    const card = await createCardForUser(session.user.id, parsed.data);

    return { data: card, error: null };
  } catch (error) {
    if (error instanceof ServiceError) {
      return {
        data: null,
        error: { code: error.code, message: error.message },
      };
    }

    console.error('[createCardAction]', error);
    return {
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create card' },
    };
  }
}

export async function updateCardAction(
  cardId: string,
  input: unknown
): Promise<ActionResult<Awaited<ReturnType<typeof updateCardForUser>>>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
    };
  }

  const parsed = UpdateCardSchema.safeParse(input);

  if (!parsed.success) {
    return {
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    };
  }

  try {
    const card = await updateCardForUser(session.user.id, cardId, parsed.data);

    return { data: card, error: null };
  } catch (error) {
    if (error instanceof ServiceError) {
      return {
        data: null,
        error: { code: error.code, message: error.message },
      };
    }

    console.error('[updateCardAction]', error);
    return {
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update card' },
    };
  }
}
