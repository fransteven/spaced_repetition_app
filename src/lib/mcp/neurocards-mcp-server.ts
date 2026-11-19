import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { MindMapMarkdownSchema, MindMapTitleSchema } from '@/lib/validations';
import { ServiceError } from '@/lib/services/service-error';
import {
  createMindMap,
  getMindMapForUser,
  listMindMaps,
  updateMindMap,
  type MindMap,
} from '@/lib/services/mind-map-service';

/**
 * MCP server for one authenticated user. Works with any MCP client that speaks
 * Streamable HTTP: Claude (claude.ai connectors, Desktop, Code) and ChatGPT
 * (developer-mode connectors). A fresh instance is built per request (stateless).
 */

const FORMAT_GUIDE = `Write the map as a Markdown outline:
- exactly one "# " heading = the central topic
- "## " headings = main branches, "### " = sub-branches
- nested "- " bullets (indent 2 spaces per level) = details under a heading
Keep every node short (a keyword or a phrase of at most ~12 words); put one idea per node.
Aim for 3–7 main branches and 2–6 children per node. Inline formatting is stripped. Max 1000 nodes.`;

const INSTRUCTIONS = `NeuroCards stores the user's mind maps (mental models of a topic) and renders them as interactive diagrams.
When the user asks for a mind map, concept map or mental model, call create_mind_map with a Markdown outline and share the returned link.
To change an existing map, find it with list_mind_maps, read it with get_mind_map and save the full new outline with update_mind_map.
${FORMAT_GUIDE}`;

const IdSchema = z.uuid().describe('Mind map id (from list_mind_maps or create_mind_map)');

function text(value: string): CallToolResult['content'][number] {
  return { type: 'text', text: value };
}

function failure(error: unknown, context: string): CallToolResult {
  if (error instanceof ServiceError) {
    // Ownership failures look like a missing map: never confirm another user's ids.
    const message = error.code === 'FORBIDDEN' ? 'Mind map not found' : error.message;
    return { isError: true, content: [text(message)] };
  }
  console.error(context, error);
  return { isError: true, content: [text('Something went wrong on NeuroCards. Try again.')] };
}

export function buildMindMapMcpServer(userId: string, origin: string): McpServer {
  const server = new McpServer(
    { name: 'neurocards-mind-maps', title: 'NeuroCards mind maps', version: '1.0.0' },
    { instructions: INSTRUCTIONS },
  );
  const urlFor = (id: string): string => `${origin}/mind-maps/${id}`;
  const describe = (map: MindMap): Record<string, unknown> => ({
    id: map.id,
    title: map.title,
    url: urlFor(map.id),
    node_count: map.node_count,
    updated_at: map.updated_at.toISOString(),
  });

  server.registerTool(
    'create_mind_map',
    {
      title: 'Create mind map',
      description: `Save a new mind map (mental model of one topic) to the user's NeuroCards account and get its link.\n${FORMAT_GUIDE}`,
      inputSchema: {
        title: MindMapTitleSchema.optional().describe('Short title. Defaults to the "# " heading.'),
        markdown: MindMapMarkdownSchema.describe('The whole map as a Markdown outline'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ title, markdown }) => {
      try {
        const map = await createMindMap(userId, { title, markdown }, 'mcp');
        return {
          content: [text(`Saved "${map.title}" (${map.node_count} nodes). Open it: ${urlFor(map.id)}`)],
          structuredContent: describe(map),
        };
      } catch (error) {
        return failure(error, '[mcp create_mind_map]');
      }
    },
  );

  server.registerTool(
    'list_mind_maps',
    {
      title: 'List mind maps',
      description: "List the user's mind maps, newest first. Optionally filter by words in the title or content.",
      inputSchema: {
        query: z.string().trim().max(100).optional().describe('Text to search in titles and content'),
        limit: z.number().int().min(1).max(50).optional().describe('How many to return (default 20)'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, limit }) => {
      try {
        const maps = await listMindMaps(userId, { query, limit: limit ?? 20 });
        const items = maps.map((map) => ({
          id: map.id,
          title: map.title,
          url: urlFor(map.id),
          node_count: map.node_count,
          updated_at: map.updated_at.toISOString(),
        }));
        const summary =
          items.length === 0
            ? 'No mind maps found.'
            : items.map((item) => `- ${item.title} (${item.node_count} nodes) — id ${item.id} — ${item.url}`).join('\n');
        return { content: [text(summary)], structuredContent: { mind_maps: items } };
      } catch (error) {
        return failure(error, '[mcp list_mind_maps]');
      }
    },
  );

  server.registerTool(
    'get_mind_map',
    {
      title: 'Read mind map',
      description: 'Read one mind map, including its full Markdown outline (use it before updating the map).',
      inputSchema: { id: IdSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      try {
        const map = await getMindMapForUser(userId, id);
        return {
          content: [text(`# ${map.title}\nLink: ${urlFor(map.id)}\n\n${map.markdown}`)],
          structuredContent: { ...describe(map), markdown: map.markdown },
        };
      } catch (error) {
        return failure(error, '[mcp get_mind_map]');
      }
    },
  );

  server.registerTool(
    'update_mind_map',
    {
      title: 'Update mind map',
      description: `Replace the title and/or the whole Markdown outline of an existing mind map. Send the complete new outline, not a diff.\n${FORMAT_GUIDE}`,
      inputSchema: {
        id: IdSchema,
        title: MindMapTitleSchema.optional().describe('New title'),
        markdown: MindMapMarkdownSchema.optional().describe('The complete new outline'),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, title, markdown }) => {
      if (title === undefined && markdown === undefined) {
        return { isError: true, content: [text('Send a new title, a new markdown outline, or both.')] };
      }
      try {
        const map = await updateMindMap(userId, id, { title, markdown });
        return {
          content: [text(`Updated "${map.title}" (${map.node_count} nodes): ${urlFor(map.id)}`)],
          structuredContent: describe(map),
        };
      } catch (error) {
        return failure(error, '[mcp update_mind_map]');
      }
    },
  );

  return server;
}
