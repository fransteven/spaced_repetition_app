import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadCardImage } from '@/lib/cloudinary';

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file     = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'No file provided' } },
        { status: 400 }
      );
    }

    const url = await uploadCardImage(file);
    return NextResponse.json({ data: { url }, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    if (message.includes('5 MB') || message.includes('Invalid image')) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message } },
        { status: 400 }
      );
    }
    console.error('[POST /api/upload]', e);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Upload failed' } },
      { status: 500 }
    );
  }
}
