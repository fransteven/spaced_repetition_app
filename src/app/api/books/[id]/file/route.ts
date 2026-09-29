import type { NextResponse } from 'next/server';
import { streamBookBlob } from '@/lib/books/stream-book-blob';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params): Promise<Response | NextResponse> {
  const { id } = await params;
  return streamBookBlob(id, 'file');
}
