import { and, desc, eq, ilike, or } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

import { db } from '@/lib/db';
import { mindMaps, type MindMapSource } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';
import { MAX_MIND_MAP_NODES, countMindMapNodes, parseMindMapMarkdown } from '@/lib/mind-maps/parse-markdown';

export type MindMap = InferSelectModel<typeof mindMaps>;
export type MindMapSummary = Pick<MindMap, 'id' | 'title' | 'node_count' | 'source' | 'created_at' | 'updated_at'>;

export const MAX_MIND_MAPS_PER_USER = 500;

interface MindMapInput {
  title?: string;
  markdown: string;
}

/** Parses once to validate the outline, count nodes and derive a title when none is given. */
function prepare(input: MindMapInput): { title: string; markdown: string; node_count: number } {
  const markdown = input.markdown.trim();
  const tree = parseMindMapMarkdown(markdown, input.title);
  const nodeCount = countMindMapNodes(tree);
  if (nodeCount > MAX_MIND_MAP_NODES) {
    throw new ServiceError('VALIDATION_ERROR', `A mind map can have up to ${MAX_MIND_MAP_NODES} nodes (this one has ${nodeCount})`);
  }
  const title = input.title?.trim() || tree.text;
  return { title: title.slice(0, 120), markdown, node_count: nodeCount };
}

const SUMMARY_COLUMNS = {
  id: mindMaps.id,
  title: mindMaps.title,
  node_count: mindMaps.node_count,
  source: mindMaps.source,
  created_at: mindMaps.created_at,
  updated_at: mindMaps.updated_at,
};

export async function listMindMaps(
  userId: string,
  options: { query?: string; limit?: number } = {},
): Promise<MindMapSummary[]> {
  const query = options.query?.trim();
  const pattern = query ? `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%` : null;
  return db
    .select(SUMMARY_COLUMNS)
    .from(mindMaps)
    .where(
      pattern
        ? and(eq(mindMaps.user_id, userId), or(ilike(mindMaps.title, pattern), ilike(mindMaps.markdown, pattern)))
        : eq(mindMaps.user_id, userId),
    )
    .orderBy(desc(mindMaps.updated_at))
    .limit(options.limit ?? MAX_MIND_MAPS_PER_USER);
}

export async function getMindMapForUser(userId: string, mindMapId: string): Promise<MindMap> {
  const [mindMap] = await db.select().from(mindMaps).where(eq(mindMaps.id, mindMapId));
  if (!mindMap) throw new ServiceError('NOT_FOUND', 'Mind map not found');
  if (mindMap.user_id !== userId) throw new ServiceError('FORBIDDEN', 'Access denied');
  return mindMap;
}

export async function createMindMap(userId: string, input: MindMapInput, source: MindMapSource): Promise<MindMap> {
  const values = prepare(input);
  const existing = await db.$count(mindMaps, eq(mindMaps.user_id, userId));
  if (existing >= MAX_MIND_MAPS_PER_USER) {
    throw new ServiceError('VALIDATION_ERROR', `You can keep up to ${MAX_MIND_MAPS_PER_USER} mind maps`);
  }
  const [mindMap] = await db.insert(mindMaps).values({ ...values, user_id: userId, source }).returning();
  return mindMap;
}

export async function updateMindMap(
  userId: string,
  mindMapId: string,
  patch: { title?: string; markdown?: string },
): Promise<MindMap> {
  const current = await getMindMapForUser(userId, mindMapId);
  const values = prepare({
    markdown: patch.markdown ?? current.markdown,
    // An explicit empty title re-derives it from the outline.
    title: patch.title ?? current.title,
  });
  const [mindMap] = await db
    .update(mindMaps)
    .set({ ...values, updated_at: new Date() })
    .where(and(eq(mindMaps.id, mindMapId), eq(mindMaps.user_id, userId)))
    .returning();
  return mindMap;
}

export async function deleteMindMap(userId: string, mindMapId: string): Promise<void> {
  await getMindMapForUser(userId, mindMapId);
  await db.delete(mindMaps).where(and(eq(mindMaps.id, mindMapId), eq(mindMaps.user_id, userId)));
}
