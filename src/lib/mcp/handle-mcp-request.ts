import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { resolveApiToken } from '@/lib/services/api-token-service';
import { buildMindMapMcpServer } from '@/lib/mcp/mind-map-mcp-server';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function jsonRpcError(status: number, message: string): Response {
  return withCors(
    Response.json({ jsonrpc: '2.0', error: { code: -32001, message }, id: null }, { status }),
  );
}

export function mcpPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Serves one MCP request for the owner of `token`. Stateless Streamable HTTP with JSON
 * responses: no session to keep between serverless invocations.
 */
export async function handleMcpRequest(request: Request, token: string | null): Promise<Response> {
  const userId = token ? await resolveApiToken(token).catch((error: unknown) => {
    console.error('[mcp auth]', error);
    return null;
  }) : null;
  if (!userId) {
    return jsonRpcError(401, 'Invalid or missing NeuroCards access token. Create one in NeuroCards → Settings → AI assistants.');
  }

  const origin = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  const server = buildMindMapMcpServer(userId, origin.replace(/\/+$/, ''));
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return withCors(await transport.handleRequest(request));
  } catch (error) {
    console.error('[mcp request]', error);
    return jsonRpcError(500, 'Internal error');
  } finally {
    // Stateless: the response is complete, so the per-request server can go.
    void server.close().catch(() => undefined);
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
}
