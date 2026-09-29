/**
 * Library limits — shared by the upload token route, the confirm route and the
 * client-side upload form so the three never disagree.
 */
export const MAX_BOOK_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_BOOKS_PER_USER = 50;
export const EPUB_CONTENT_TYPE = 'application/epub+zip';

// Zip-bomb guards for server-side processing.
export const MAX_UNCOMPRESSED_BYTES = 300 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 5000;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

export function buildBookPathname(userId: string, fileId: string): string {
  return `books/${userId}/${fileId}.epub`;
}

/** A book pathname is only valid inside the uploader's own folder. */
export function isOwnBookPathname(userId: string, pathname: string): boolean {
  return new RegExp(`^books/${userId}/${UUID}\\.epub$`).test(pathname);
}
