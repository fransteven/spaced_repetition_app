'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/lib/auth';
import { deleteCanvas, updateCanvas } from '@/lib/services/canvas-service';
import { ServiceError } from '@/lib/services/service-error';
import { DbIdSchema, RenameCanvasSchema } from '@/lib/validations';

interface ActionError {
  code: 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'UNAVAILABLE' | 'INTERNAL_ERROR';
  message: string;
}

export interface ActionResult<T> {
  data: T | null;
  error: ActionError | null;
}

async function run<T>(context: string, fallback: string, work: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const session = await auth();
  if (!session?.user?.id) return { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } };
  try {
    return { data: await work(session.user.id), error: null };
  } catch (error) {
    if (error instanceof ServiceError) return { data: null, error: { code: error.code, message: error.message } };
    console.error(context, error);
    return { data: null, error: { code: 'INTERNAL_ERROR', message: fallback } };
  }
}

function invalid(message: string): ActionResult<never> {
  return { data: null, error: { code: 'VALIDATION_ERROR', message } };
}

export async function renameCanvasAction(canvasId: string, input: unknown): Promise<ActionResult<{ title: string }>> {
  if (!DbIdSchema.safeParse(canvasId).success) return invalid('Invalid canvas id');
  const parsed = RenameCanvasSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Invalid title');
  return run('[renameCanvasAction]', 'Failed to rename the canvas', async (userId) => {
    const canvas = await updateCanvas(userId, canvasId, { title: parsed.data.title });
    revalidatePath('/mind-maps/canvases');
    revalidatePath(`/mind-maps/canvases/${canvas.id}`);
    return { title: canvas.title };
  });
}

export async function deleteCanvasAction(canvasId: string): Promise<ActionResult<true>> {
  if (!DbIdSchema.safeParse(canvasId).success) return invalid('Invalid canvas id');
  return run('[deleteCanvasAction]', 'Failed to delete the canvas', async (userId) => {
    await deleteCanvas(userId, canvasId);
    revalidatePath('/mind-maps/canvases');
    return true as const;
  });
}
