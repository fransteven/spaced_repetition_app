import type { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { fail, failFromError, ok } from '@/lib/api-response';
import { CANVAS_FILE_PATTERN, MAX_CANVAS_SIZE_BYTES, titleFromFilename } from '@/lib/canvases/limits';
import { createCanvas } from '@/lib/services/canvas-service';
import { CreateCanvasSchema } from '@/lib/validations';

/** Upload one .html file (multipart field `file`, optional `title`). Never sanitised: see csp.ts. */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail('UNAUTHORIZED', 'Not authenticated');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid upload');
  }

  const file = form.get('file');
  if (!(file instanceof File)) return fail('VALIDATION_ERROR', 'Choose an HTML file');
  if (!CANVAS_FILE_PATTERN.test(file.name)) return fail('VALIDATION_ERROR', 'Only .html files are supported');
  if (file.size > MAX_CANVAS_SIZE_BYTES) return fail('VALIDATION_ERROR', 'A canvas can be up to 2 MB');

  let html: string;
  try {
    html = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(await file.arrayBuffer());
  } catch {
    return fail('VALIDATION_ERROR', 'The file must be UTF-8 text');
  }

  const title = form.get('title');
  const parsed = CreateCanvasSchema.safeParse({ html, title: typeof title === 'string' && title.trim() ? title : undefined });
  if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid canvas');

  try {
    const canvas = await createCanvas(session.user.id, { ...parsed.data, fallbackTitle: titleFromFilename(file.name) }, 'upload');
    return ok({ id: canvas.id, title: canvas.title }, 201);
  } catch (error) {
    return failFromError(error, '[POST /api/canvases]', 'Failed to save the canvas');
  }
}
