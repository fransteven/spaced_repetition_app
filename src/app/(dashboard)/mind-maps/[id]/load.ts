import { notFound } from 'next/navigation';
import { z } from 'zod';

import { getMindMapForUser, type MindMap } from '@/lib/services/mind-map-service';
import { ServiceError } from '@/lib/services/service-error';

/** The user's mind map, or the 404 page (unknown id, bad id, or someone else's map). */
export async function loadMindMapOr404(userId: string, id: string): Promise<MindMap> {
  if (!z.uuid().safeParse(id).success) notFound();
  try {
    return await getMindMapForUser(userId, id);
  } catch (error) {
    if (error instanceof ServiceError && (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN')) notFound();
    throw error;
  }
}
