import type { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { fail, failFromError } from '@/lib/api-response';
import { canvasResponseHeaders } from '@/lib/canvases/csp';
import { utf8ByteLength } from '@/lib/canvases/limits';
import { getCanvasDocumentForUser } from '@/lib/services/canvas-service';
import { DbIdSchema } from '@/lib/validations';

type Params = { params: Promise<{ id: string }> };

/** The canvas document, for <iframe sandbox="allow-scripts"> only; the CSP keeps it sandboxed when opened directly. */
export async function GET(_request: Request, { params }: Params): Promise<Response | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');

  const { id } = await params;
  if (!DbIdSchema.safeParse(id).success) return fail('NOT_FOUND', 'Canvas not found');

  try {
    const html = await getCanvasDocumentForUser(session.user.id, id);
    return new Response(html, { headers: canvasResponseHeaders(utf8ByteLength(html)) });
  } catch (error) {
    return failFromError(error, '[GET /api/canvases/[id]/raw]', 'Failed to load the canvas');
  }
}
