import { bearerToken, handleMcpRequest, mcpPreflight } from '@/lib/mcp/handle-mcp-request';

// MCP endpoint for clients that send the token as a header (Claude Code, Claude Desktop):
// Authorization: Bearer nck_…  — see Settings → AI assistants.
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  return handleMcpRequest(request, bearerToken(request));
}

export async function GET(request: Request): Promise<Response> {
  return handleMcpRequest(request, bearerToken(request));
}

export async function DELETE(request: Request): Promise<Response> {
  return handleMcpRequest(request, bearerToken(request));
}

export function OPTIONS(): Response {
  return mcpPreflight();
}
