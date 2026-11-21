import { notFound } from 'next/navigation';

import { getCanvasForUser, type CanvasMeta } from '@/lib/services/canvas-service';
import { ServiceError } from '@/lib/services/service-error';
import { DbIdSchema } from '@/lib/validations';

/** The user's canvas, or the 404 page (unknown id, bad id, or someone else's canvas). */
export async function loadCanvasOr404(userId: string, id: string): Promise<CanvasMeta> {
  if (!DbIdSchema.safeParse(id).success) notFound();
  try {
    return await getCanvasForUser(userId, id);
  } catch (error) {
    if (error instanceof ServiceError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }
}
