/**
 * book-links.ts — works out where a link inside a book section points.
 *
 * epub.js resolves links against the section's <base>, but sanitizeSection() removes every <base>
 * (a book could use one to redirect its URLs), so its own handler resolved them against the app's
 * page URL and display() silently went nowhere. The reader resolves them here instead, against the
 * section's spine href, which is what rendition.display() expects.
 */

export type BookLink =
  | { kind: 'internal'; target: string } // spine href (relative to the OPF) + optional #fragment
  | { kind: 'external'; url: string };

// Placeholder origin: only used to resolve relative paths, never fetched.
const BOOK_ORIGIN = 'https://book.invalid';

export function resolveBookLink(href: string, sectionHref: string): BookLink | null {
  const value = href.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value, `${BOOK_ORIGIN}/${sectionHref.replace(/^\/+/, '')}`);
  } catch {
    return null;
  }
  if (url.origin !== BOOK_ORIGIN) {
    return url.protocol === 'http:' || url.protocol === 'https:' ? { kind: 'external', url: url.href } : null;
  }
  let path: string;
  try {
    path = decodeURIComponent(url.pathname.slice(1));
  } catch {
    path = url.pathname.slice(1);
  }
  if (!path) return null;
  return { kind: 'internal', target: `${path}${url.hash}` };
}
