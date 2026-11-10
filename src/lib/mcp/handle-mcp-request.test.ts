import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const MAP_ID = '22222222-2222-4222-8222-222222222222';
const VALID_TOKEN = `nck_${'a'.repeat(43)}`;

const createMindMap = vi.fn();
const getMindMapForUser = vi.fn();

vi.mock('@/lib/services/api-token-service', () => ({
  resolveApiToken: async (token: string) => (token === VALID_TOKEN ? USER_ID : null),
}));

vi.mock('@/lib/services/mind-map-service', () => ({
  createMindMap: (...args: unknown[]) => createMindMap(...args),
  getMindMapForUser: (...args: unknown[]) => getMindMapForUser(...args),
  listMindMaps: async () => [],
  updateMindMap: vi.fn(),
}));

const { handleMcpRequest } = await import('./handle-mcp-request');
const { ServiceError } = await import('@/lib/services/service-error');

function rpc(method: string, params: Record<string, unknown> = {}, id = 1): Request {
  return new Request('https://app.test/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
}

async function call(method: string, params?: Record<string, unknown>, token: string | null = VALID_TOKEN) {
  const response = await handleMcpRequest(rpc(method, params), token);
  return { status: response.status, body: await response.json() };
}

describe('MCP endpoint', () => {
  beforeEach(() => {
    createMindMap.mockReset();
    getMindMapForUser.mockReset();
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
  });

  it('rejects a missing or unknown token', async () => {
    expect((await call('tools/list', {}, null)).status).toBe(401);
    expect((await call('tools/list', {}, `nck_${'b'.repeat(43)}`)).status).toBe(401);
  });

  it('completes the initialize handshake with instructions', async () => {
    const { status, body } = await call('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    });
    expect(status).toBe(200);
    expect(body.result.serverInfo.name).toBe('neurocards-mind-maps');
    expect(body.result.capabilities.tools).toBeDefined();
    expect(body.result.instructions).toContain('create_mind_map');
  });

  it('lists the four mind map tools with JSON schemas', async () => {
    const { body } = await call('tools/list');
    const names = body.result.tools.map((tool: { name: string }) => tool.name).sort();
    expect(names).toEqual(['create_mind_map', 'get_mind_map', 'list_mind_maps', 'update_mind_map']);
    const create = body.result.tools.find((tool: { name: string }) => tool.name === 'create_mind_map');
    expect(create.inputSchema.required).toEqual(['markdown']);
  });

  it('creates a map for the token owner and returns its link', async () => {
    createMindMap.mockResolvedValue({
      id: MAP_ID,
      title: 'Cells',
      node_count: 3,
      updated_at: new Date('2026-11-10T00:00:00Z'),
    });
    const { body } = await call('tools/call', {
      name: 'create_mind_map',
      arguments: { markdown: '# Cells\n- Nucleus\n- Membrane' },
    });
    expect(createMindMap).toHaveBeenCalledWith(USER_ID, { title: undefined, markdown: '# Cells\n- Nucleus\n- Membrane' }, 'mcp');
    expect(body.result.isError).toBeFalsy();
    expect(body.result.structuredContent.url).toBe(`https://app.test/mind-maps/${MAP_ID}`);
    expect(body.result.content[0].text).toContain(`https://app.test/mind-maps/${MAP_ID}`);
  });

  it("hides another user's map behind not found", async () => {
    getMindMapForUser.mockRejectedValue(new ServiceError('FORBIDDEN', 'Access denied'));
    const { body } = await call('tools/call', { name: 'get_mind_map', arguments: { id: MAP_ID } });
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toBe('Mind map not found');
  });

  it('validates tool input', async () => {
    const { body } = await call('tools/call', { name: 'create_mind_map', arguments: { markdown: '' } });
    expect(body.result?.isError ?? Boolean(body.error)).toBe(true);
    expect(createMindMap).not.toHaveBeenCalled();
  });
});
