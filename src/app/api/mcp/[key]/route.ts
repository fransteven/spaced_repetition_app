import { bearerToken, handleMcpRequest, mcpPreflight } from '@/lib/mcp/handle-mcp-request';

// MCP endpoint with the token in the URL, for connector UIs that only take a URL
// (claude.ai custom connectors, ChatGPT developer-mode apps). Treat the URL as a secret.
export const maxDuration = 60;

type Context = { params: Promise<{ key: string }> };

async function handle(request: Request, { params }: Context): Promise<Response> {
  const { key } = await params;
  return handleMcpRequest(request, bearerToken(request) ?? key);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;

export function OPTIONS(): Response {
  return mcpPreflight();
}
