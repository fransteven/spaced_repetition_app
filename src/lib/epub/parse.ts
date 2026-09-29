/**
 * parse.ts — server-side EPUB parsing (pure functions, no I/O).
 *
 * Validates the container, reads OPF metadata, finds the cover and extracts a
 * plain-text version of every spine item. Used by the `book-process` Inngest
 * function; never imported from client code.
 */

import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { parse as parseHtml } from 'node-html-parser';
import { EPUB_CONTENT_TYPE, MAX_UNCOMPRESSED_BYTES, MAX_ZIP_ENTRIES } from '@/lib/books/limits';

export class EpubError extends Error {}

export interface EpubSection {
  spineIndex: number;
  href: string;
  title: string | null;
  text: string;
}

export interface ParsedEpub {
  title: string | null;
  author: string | null;
  language: string | null;
  cover: { bytes: Uint8Array; contentType: string; extension: string } | null;
  sections: EpubSection[];
}

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties: string;
}

type XmlNode = Record<string, unknown>;

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  isArray: (name) => ['item', 'itemref', 'meta', 'navPoint', 'li', 'creator', 'title', 'language', 'rootfile'].includes(name),
});

function isNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNode(value: unknown): XmlNode | null {
  return isNode(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function textOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  const node = asNode(value);
  if (node && '#text' in node) return textOf(node['#text']);
  return null;
}

function attr(node: XmlNode | null, name: string): string {
  const value = node?.[`@_${name}`];
  return typeof value === 'string' ? value : '';
}

function dirname(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index + 1);
}

/** Resolves an href relative to a base file inside the zip. */
function resolvePath(base: string, href: string): string {
  const parts = (dirname(base) + decodeURIComponent(href.split('#')[0])).split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '..') out.pop();
    else if (part !== '.' && part !== '') out.push(part);
  }
  return out.join('/');
}

function unzip(data: Uint8Array): Record<string, Uint8Array> {
  let entries = 0;
  let total = 0;
  try {
    return unzipSync(data, {
      filter: (file) => {
        entries += 1;
        total += file.originalSize;
        if (entries > MAX_ZIP_ENTRIES || total > MAX_UNCOMPRESSED_BYTES) {
          throw new EpubError('The EPUB is too large once uncompressed');
        }
        return true;
      },
    });
  } catch (error) {
    if (error instanceof EpubError) throw error;
    throw new EpubError('The file is not a valid EPUB (unreadable zip)');
  }
}

function readTocLabels(files: Record<string, Uint8Array>, opfPath: string, manifest: ManifestItem[], tocId: string): Map<string, string> {
  const labels = new Map<string, string>();

  // EPUB 3 navigation document.
  const nav = manifest.find((item) => item.properties.split(' ').includes('nav'));
  if (nav) {
    const navPath = resolvePath(opfPath, nav.href);
    const bytes = files[navPath];
    if (bytes) {
      const root = parseHtml(strFromU8(bytes));
      for (const link of root.querySelectorAll('nav a[href]')) {
        const target = resolvePath(navPath, link.getAttribute('href') ?? '');
        const label = link.text.replace(/\s+/g, ' ').trim();
        if (label && !labels.has(target)) labels.set(target, label);
      }
      if (labels.size > 0) return labels;
    }
  }

  // EPUB 2 NCX.
  const ncxItem = manifest.find((item) => item.id === tocId) ?? manifest.find((item) => item.mediaType === 'application/x-dtbncx+xml');
  if (!ncxItem) return labels;
  const ncxPath = resolvePath(opfPath, ncxItem.href);
  const bytes = files[ncxPath];
  if (!bytes) return labels;

  const walk = (points: unknown[]): void => {
    for (const point of points) {
      const node = asNode(point);
      if (!node) continue;
      const label = textOf(asNode(node.navLabel)?.text);
      const src = attr(asNode(node.content), 'src');
      if (label && src) {
        const target = resolvePath(ncxPath, src);
        if (!labels.has(target)) labels.set(target, label);
      }
      walk(asArray(node.navPoint));
    }
  };
  const ncx = asNode(asNode(xml.parse(strFromU8(bytes)))?.ncx);
  walk(asArray(asNode(ncx?.navMap)?.navPoint));
  return labels;
}

function htmlToText(source: string): string {
  const body = parseHtml(source).querySelector('body');
  if (!body) return '';
  body.querySelectorAll('script, style').forEach((node) => node.remove());
  return body.structuredText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function parseEpub(data: Uint8Array): ParsedEpub {
  const files = unzip(data);

  const mimetype = files.mimetype ? strFromU8(files.mimetype).trim() : '';
  if (mimetype !== EPUB_CONTENT_TYPE) throw new EpubError('The file is not a valid EPUB (bad mimetype)');

  const containerBytes = files['META-INF/container.xml'];
  if (!containerBytes) throw new EpubError('The EPUB is missing META-INF/container.xml');
  const container = asNode(asNode(xml.parse(strFromU8(containerBytes)))?.container);
  const rootfile = asNode(asArray(asNode(container?.rootfiles)?.rootfile)[0]);
  const opfPath = attr(rootfile, 'full-path');
  const opfBytes = opfPath ? files[opfPath] : undefined;
  if (!opfBytes) throw new EpubError('The EPUB is missing its package document');

  const pkg = asNode(asNode(xml.parse(strFromU8(opfBytes)))?.package);
  const metadata = asNode(pkg?.metadata);

  const manifest: ManifestItem[] = asArray(asNode(pkg?.manifest)?.item)
    .map((item) => asNode(item))
    .filter((item): item is XmlNode => item !== null)
    .map((item) => ({
      id: attr(item, 'id'),
      href: attr(item, 'href'),
      mediaType: attr(item, 'media-type'),
      properties: attr(item, 'properties'),
    }));
  const byId = new Map(manifest.map((item) => [item.id, item]));

  const spineNode = asNode(pkg?.spine);
  const tocLabels = readTocLabels(files, opfPath, manifest, attr(spineNode, 'toc'));

  const sections: EpubSection[] = [];
  asArray(spineNode?.itemref).forEach((ref) => {
    const item = byId.get(attr(asNode(ref), 'idref'));
    if (!item) return;
    const path = resolvePath(opfPath, item.href);
    const bytes = files[path];
    if (!bytes) return;
    const text = htmlToText(strFromU8(bytes));
    if (!text) return;
    sections.push({ spineIndex: sections.length, href: path, title: tocLabels.get(path) ?? null, text });
  });

  if (sections.length === 0) throw new EpubError('The EPUB has no readable text');

  // Cover: EPUB 3 `cover-image` property, then EPUB 2 <meta name="cover">.
  const coverMetaId = asArray(metadata?.meta)
    .map((meta) => asNode(meta))
    .find((meta) => attr(meta, 'name') === 'cover');
  const coverItem =
    manifest.find((item) => item.properties.split(' ').includes('cover-image')) ??
    (coverMetaId ? byId.get(attr(coverMetaId, 'content')) : undefined);
  const coverPath = coverItem ? resolvePath(opfPath, coverItem.href) : null;
  const coverBytes = coverPath ? files[coverPath] : undefined;
  const coverExtension = coverItem ? IMAGE_EXTENSIONS[coverItem.mediaType] : undefined;

  return {
    title: textOf(asArray(metadata?.title)[0]),
    author: textOf(asArray(metadata?.creator)[0]),
    language: textOf(asArray(metadata?.language)[0]),
    cover:
      coverItem && coverBytes && coverExtension
        ? { bytes: coverBytes, contentType: coverItem.mediaType, extension: coverExtension }
        : null,
    sections,
  };
}
