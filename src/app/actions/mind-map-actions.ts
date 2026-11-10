'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { CreateApiTokenSchema, CreateMindMapSchema, UpdateMindMapSchema } from '@/lib/validations';
import { createMindMap, deleteMindMap, updateMindMap } from '@/lib/services/mind-map-service';
import { createApiToken, revokeApiToken, type ApiTokenSummary } from '@/lib/services/api-token-service';
import { ServiceError } from '@/lib/services/service-error';

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

const IdSchema = z.uuid();

function invalid(message: string): ActionResult<never> {
  return { data: null, error: { code: 'VALIDATION_ERROR', message } };
}

export async function createMindMapAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateMindMapSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Invalid mind map');
  return run('[createMindMapAction]', 'Failed to save the mind map', async (userId) => {
    const map = await createMindMap(userId, parsed.data, 'app');
    revalidatePath('/mind-maps');
    return { id: map.id };
  });
}

export async function updateMindMapAction(mindMapId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = UpdateMindMapSchema.safeParse(input);
  if (!IdSchema.safeParse(mindMapId).success) return invalid('Invalid mind map id');
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Invalid mind map');
  return run('[updateMindMapAction]', 'Failed to save the mind map', async (userId) => {
    const map = await updateMindMap(userId, mindMapId, parsed.data);
    revalidatePath('/mind-maps');
    revalidatePath(`/mind-maps/${map.id}`);
    return { id: map.id };
  });
}

export async function deleteMindMapAction(mindMapId: string): Promise<ActionResult<true>> {
  if (!IdSchema.safeParse(mindMapId).success) return invalid('Invalid mind map id');
  return run('[deleteMindMapAction]', 'Failed to delete the mind map', async (userId) => {
    await deleteMindMap(userId, mindMapId);
    revalidatePath('/mind-maps');
    return true as const;
  });
}

export async function createApiTokenAction(
  input: unknown,
): Promise<ActionResult<{ token: string; record: ApiTokenSummary }>> {
  const parsed = CreateApiTokenSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Invalid name');
  return run('[createApiTokenAction]', 'Failed to create the connection', async (userId) => {
    const created = await createApiToken(userId, parsed.data.name);
    revalidatePath('/settings');
    return created;
  });
}

export async function revokeApiTokenAction(tokenId: string): Promise<ActionResult<true>> {
  if (!IdSchema.safeParse(tokenId).success) return invalid('Invalid connection id');
  return run('[revokeApiTokenAction]', 'Failed to revoke the connection', async (userId) => {
    await revokeApiToken(userId, tokenId);
    revalidatePath('/settings');
    return true as const;
  });
}
