import { BlobNotFoundError, del, get, head, put } from '@vercel/blob';
import type { HeadBlobResult } from '@vercel/blob';

/**
 * Server-only wrapper around Vercel Blob. Books and covers are stored as
 * private blobs; their URLs never reach the client — the reader streams them
 * through ownership-checked API routes.
 */

/**
 * Always authenticate with the read-write token when it exists. Otherwise the
 * SDK prefers OIDC as soon as VERCEL_OIDC_TOKEN + BLOB_STORE_ID are present
 * (e.g. after `vercel env pull`), and Vercel rejects OIDC outside the
 * environments it is enabled for — head/get/put/del would all fail locally.
 */
function blobAuth(): { token?: string } {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token ? { token } : {};
}

const HEAD_RETRIES = 5;
const HEAD_BACKOFF_MS = 400;

/**
 * Blob metadata can lag a moment behind a finished client upload, so a miss
 * is retried with a short backoff before the blob is treated as missing.
 */
export async function headBlob(pathname: string): Promise<HeadBlobResult | null> {
  for (let attempt = 1; attempt <= HEAD_RETRIES; attempt++) {
    try {
      return await head(pathname, blobAuth());
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) {
        console.error('[headBlob]', pathname, error);
        return null;
      }
      if (attempt < HEAD_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, HEAD_BACKOFF_MS * attempt));
      }
    }
  }
  return null;
}

export async function readBlobBytes(pathname: string): Promise<Uint8Array> {
  const result = await get(pathname, { access: 'private', ...blobAuth() });
  if (!result || result.statusCode !== 200) throw new Error(`Blob not found: ${pathname}`);
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

export async function openBlobStream(
  pathname: string
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; size: number } | null> {
  const result = await get(pathname, { access: 'private', ...blobAuth() });
  if (!result || result.statusCode !== 200) return null;
  return { stream: result.stream, contentType: result.blob.contentType, size: result.blob.size };
}

export async function putPrivateBlob(
  pathname: string,
  body: Uint8Array,
  contentType: string
): Promise<void> {
  await put(pathname, Buffer.from(body), {
    access: 'private',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    ...blobAuth(),
  });
}

export async function deleteBlobs(pathnames: string[]): Promise<void> {
  if (pathnames.length > 0) await del(pathnames, blobAuth());
}
