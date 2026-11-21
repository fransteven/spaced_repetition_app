import { and, count, desc, eq, sum } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

import { db } from '@/lib/db';
import { canvases, decks, type CanvasSource } from '@/lib/db/schema';
import { assertDeckOwnership } from '@/lib/services/deck-service';
import { ServiceError } from '@/lib/services/service-error';
import {
  MAX_CANVASES_PER_USER,
  MAX_CANVAS_TITLE_LENGTH,
  MAX_CANVAS_TOTAL_BYTES,
  utf8ByteLength,
} from '@/lib/canvases/limits';
import { extractCanvasTitle, prepareCanvasHtml } from '@/lib/canvases/prepare-html';

export type Canvas = InferSelectModel<typeof canvases>;
export type CanvasMeta = Omit<Canvas, 'html'>;
export type CanvasSummary = Pick<Canvas, 'id' | 'title' | 'description' | 'deck_id' | 'size_bytes' | 'source' | 'created_at' | 'updated_at'> & {
  deck_name: string | null;
};

export interface CanvasInput {
  title?: string;
  html: string;
  description?: string;
  deck_id?: string;
  /** Used when neither `title` nor the document's <title> gives one (e.g. the uploaded file name). */
  fallbackTitle?: string;
}

const META_COLUMNS = {
  id: canvases.id,
  user_id: canvases.user_id,
  deck_id: canvases.deck_id,
  title: canvases.title,
  description: canvases.description,
  size_bytes: canvases.size_bytes,
  source: canvases.source,
  created_at: canvases.created_at,
  updated_at: canvases.updated_at,
};

// Someone else's canvas is reported as missing: ids never confirm that a canvas exists.
const notFound = (): ServiceError => new ServiceError('NOT_FOUND', 'Canvas not found');

export async function listCanvases(userId: string): Promise<CanvasSummary[]> {
  return db
    .select({
      id: canvases.id,
      title: canvases.title,
      description: canvases.description,
      deck_id: canvases.deck_id,
      size_bytes: canvases.size_bytes,
      source: canvases.source,
      created_at: canvases.created_at,
      updated_at: canvases.updated_at,
      deck_name: decks.name,
    })
    .from(canvases)
    .leftJoin(decks, eq(decks.id, canvases.deck_id))
    .where(eq(canvases.user_id, userId))
    .orderBy(desc(canvases.updated_at))
    .limit(MAX_CANVASES_PER_USER);
}

export async function getCanvasForUser(userId: string, canvasId: string): Promise<CanvasMeta> {
  const [canvas] = await db
    .select(META_COLUMNS)
    .from(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.user_id, userId)));
  if (!canvas) throw notFound();
  return canvas;
}

/** The HTML exactly as the sandboxed frame receives it (storage shim, fragments wrapped). */
export async function getCanvasDocumentForUser(userId: string, canvasId: string): Promise<string> {
  const [canvas] = await db
    .select({ html: canvases.html })
    .from(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.user_id, userId)));
  if (!canvas) throw notFound();
  return prepareCanvasHtml(canvas.html);
}

async function assertQuota(userId: string, addedBytes: number, replacedBytes = 0, adding = true): Promise<void> {
  const [usage] = await db
    .select({ total: count(), bytes: sum(canvases.size_bytes) })
    .from(canvases)
    .where(eq(canvases.user_id, userId));
  if (adding && usage.total >= MAX_CANVASES_PER_USER) {
    throw new ServiceError('VALIDATION_ERROR', `You can keep up to ${MAX_CANVASES_PER_USER} canvases`);
  }
  if (Number(usage.bytes ?? 0) - replacedBytes + addedBytes > MAX_CANVAS_TOTAL_BYTES) {
    throw new ServiceError('VALIDATION_ERROR', 'Your canvases use all 50 MB of space. Delete some to add more.');
  }
}

function resolveTitle(input: Pick<CanvasInput, 'title' | 'html' | 'fallbackTitle'>): string {
  const title = input.title?.trim() || extractCanvasTitle(input.html) || input.fallbackTitle?.trim() || 'Untitled canvas';
  return title.slice(0, MAX_CANVAS_TITLE_LENGTH);
}

export async function createCanvas(userId: string, input: CanvasInput, source: CanvasSource): Promise<CanvasMeta> {
  const sizeBytes = utf8ByteLength(input.html);
  if (input.deck_id) await assertDeckOwnership(userId, input.deck_id);
  await assertQuota(userId, sizeBytes);
  const [canvas] = await db
    .insert(canvases)
    .values({
      user_id: userId,
      deck_id: input.deck_id ?? null,
      title: resolveTitle(input),
      description: input.description?.trim() || null,
      html: input.html,
      size_bytes: sizeBytes,
      source,
    })
    .returning(META_COLUMNS);
  return canvas;
}

export async function updateCanvas(
  userId: string,
  canvasId: string,
  patch: { title?: string; html?: string; description?: string | null; deck_id?: string | null },
): Promise<CanvasMeta> {
  const current = await getCanvasForUser(userId, canvasId);
  if (patch.deck_id) await assertDeckOwnership(userId, patch.deck_id);

  const values: Partial<Canvas> = { updated_at: new Date() };
  if (patch.html !== undefined) {
    values.html = patch.html;
    values.size_bytes = utf8ByteLength(patch.html);
    await assertQuota(userId, values.size_bytes, current.size_bytes, false);
  }
  if (patch.title !== undefined) values.title = resolveTitle({ title: patch.title, html: patch.html ?? '', fallbackTitle: current.title });
  if (patch.description !== undefined) values.description = patch.description?.trim() || null;
  if (patch.deck_id !== undefined) values.deck_id = patch.deck_id;

  const [canvas] = await db
    .update(canvases)
    .set(values)
    .where(and(eq(canvases.id, canvasId), eq(canvases.user_id, userId)))
    .returning(META_COLUMNS);
  return canvas;
}

export async function deleteCanvas(userId: string, canvasId: string): Promise<void> {
  const deleted = await db
    .delete(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.user_id, userId)))
    .returning({ id: canvases.id });
  if (deleted.length === 0) throw notFound();
}
