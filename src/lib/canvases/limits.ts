/** Canvas limits, shared by the upload form, the API route, the service and (later) MCP. */
export const MAX_CANVAS_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_CANVASES_PER_USER = 200;
/** All of one user's canvases together. Keeps Postgres small even with base64 images. */
export const MAX_CANVAS_TOTAL_BYTES = 50 * 1024 * 1024;
export const MAX_CANVAS_TITLE_LENGTH = 120;

export const CANVAS_FILE_PATTERN = /\.html?$/i;

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** "my-canvas.html" → "my-canvas"; used as the title when the HTML has no <title>. */
export function titleFromFilename(filename: string): string {
  return filename.replace(CANVAS_FILE_PATTERN, '').trim();
}
