'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Book, Contents, EpubCFI, Location, NavItem, Rendition } from 'epubjs';
import type Section from 'epubjs/types/section';

import type { BookAnnotation } from '@/lib/services/annotation-service';
import { highlightStyles, type ReaderTokens } from '@/components/reader/reader-theme';

/**
 * use-epub-reader.ts — owns the epub.js Book/Rendition lifecycle.
 *
 * The EPUB binary is fetched client-side because epub.js renders it in the
 * browser; everything the page *shows* besides the book itself comes from the
 * server component. Callbacks are held in refs so the rendition is created once.
 */

const LOCATION_CHARS = 1600; // ≈ one printed page; stable across font sizes
const STYLE_ID = 'nc-reader-style';
const SWIPE_MIN_PX = 50;
const TAP_DELAY_MS = 80;
const FLASH_MS = 2500;
// Re-layouts (opening the book, full screen, any resize, typography) lose the reader's place: epub.js
// re-displays the *start* of its current page, and a display() into a section that was just laid out
// often lands on the section start. So the page the reader chose is held as an anchor: relocations
// while it is held are layout noise (never reported or saved), and the anchor is displayed again until
// a relocation actually contains it.
const RESIZE_SETTLE_MS = 250;
const ANCHOR_RETRY_MS = 150;
const ANCHOR_MAX_ATTEMPTS = 4;
const ANCHOR_RELEASE_MS = 300; // trailing relocations of the successful display
const ANCHOR_GIVE_UP_MS = 3000;

export interface ReaderLocation {
  cfi: string;
  endCfi: string; // last position on the page: with `cfi`, what "this page" contains
  href: string; // spine item href of the current page (relative to the OPF)
  progress: number; // 0..1
  page: number | null;
  totalPages: number | null;
  chapter: string | null;
  atStart: boolean;
  atEnd: boolean;
}

export interface ViewportRect {
  top: number;
  left: number;
  bottom: number;
  width: number;
}

export interface TextSelection {
  cfiRange: string;
  text: string;
  context: string | null; // enclosing paragraph — helps translation and card prompts
  rect: ViewportRect;
}

interface Callbacks {
  onRelocated: (location: ReaderLocation) => void;
  onSelect: (selection: TextSelection | null) => void;
  onHighlightClick: (annotationId: string, rect: ViewportRect) => void;
  onToggleChrome: () => void;
  /** "f" key, inside or outside the page iframe. */
  onToggleFullscreen: () => void;
  onLocationsGenerated: (json: string) => void;
}

interface Options extends Callbacks {
  bookId: string;
  initialCfi: string | null;
  locationsJson: string | null;
  language: string | null;
  css: string;
  container: HTMLElement | null;
}

export interface EpubReader {
  status: 'loading' | 'ready' | 'error';
  toc: NavItem[];
  next: () => void;
  prev: () => void;
  display: (target: string) => void;
  goToPassage: (sectionPath: string, locator: string) => Promise<void>;
  clearSelection: () => void;
  renderHighlights: (annotations: BookAnnotation[], tokens: ReaderTokens) => void;
  /** Opening words of the current page (for a bookmark), or null. */
  pageExcerpt: () => string | null;
  /** True when `cfi` falls on the page described by `location`. */
  isOnPage: (cfi: string, location: ReaderLocation) => boolean;
}

const EXCERPT_CHARS = 160;

function flattenToc(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...flattenToc(item.subitems ?? [])]);
}

function isFullscreenKey(event: KeyboardEvent): boolean {
  return (event.key === 'f' || event.key === 'F') && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat;
}

/** True when `cfi` lies between `start` and `end` (inclusive). Unparseable CFIs count as not contained. */
function cfiWithin(tool: EpubCFI | null, cfi: string, start: string, end: string): boolean {
  if (!tool) return cfi === start;
  try {
    return tool.compare(cfi, start) >= 0 && tool.compare(cfi, end) <= 0;
  } catch {
    return false;
  }
}

function stripFragment(href: string): string {
  return href.split('#')[0];
}

function chapterFor(toc: NavItem[], href: string): string | null {
  const target = stripFragment(href);
  const match = flattenToc(toc).find((item) => {
    const candidate = stripFragment(item.href);
    return candidate === target || target.endsWith(`/${candidate}`) || candidate.endsWith(`/${target}`);
  });
  return match?.label.trim() ?? null;
}

/** Rendition.getContents() is typed as one Contents but returns an array. */
function contentsList(rendition: Rendition): Contents[] {
  const value: unknown = rendition.getContents();
  return Array.isArray(value) ? value : [];
}

function applyStyle(contents: Contents, css: string, language: string | null): void {
  const doc = contents.document;
  let style = doc.getElementById(STYLE_ID);
  if (!style) {
    style = doc.createElement('style');
    style.id = STYLE_ID;
    doc.head.appendChild(style);
  }
  style.textContent = css;
  if (language && !doc.documentElement.getAttribute('lang')) {
    doc.documentElement.setAttribute('lang', language);
  }
}

/** Converts a rect inside an epub.js iframe to main-viewport coordinates. */
function toViewportRect(range: Range): ViewportRect | null {
  const frame = range.startContainer.ownerDocument?.defaultView?.frameElement;
  if (!frame) return null;
  const frameRect = frame.getBoundingClientRect();
  const rect = range.getBoundingClientRect();
  return {
    top: frameRect.top + rect.top,
    left: frameRect.left + rect.left,
    bottom: frameRect.top + rect.bottom,
    width: rect.width,
  };
}

const BLOCK_SELECTOR = 'p, li, blockquote, dd, dt, td, figcaption, h1, h2, h3, h4, h5, h6';
const CONTEXT_MAX_CHARS = 1500;

/** Text of the block around a range, trimmed to a window around the selection. */
function contextFor(range: Range, selected: string): string | null {
  const node = range.commonAncestorContainer;
  // The node lives in the book's iframe, so check against that realm's Element.
  const frameWindow = node.ownerDocument?.defaultView;
  const element = frameWindow && node instanceof frameWindow.Element ? node : node.parentElement;
  const block = element?.closest(BLOCK_SELECTOR) ?? element;
  const text = block?.textContent?.replace(/\s+/g, ' ').trim();
  if (!text || text === selected) return null;
  if (text.length <= CONTEXT_MAX_CHARS) return text;
  const at = Math.max(0, text.indexOf(selected.slice(0, 40)));
  const start = Math.max(0, at - CONTEXT_MAX_CHARS / 2);
  return text.slice(start, start + CONTEXT_MAX_CHARS);
}

export function useEpubReader(options: Options): EpubReader {
  const { bookId, container } = options;
  const [status, setStatus] = useState<EpubReader['status']>('loading');
  const [toc, setToc] = useState<NavItem[]>([]);

  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const locationsReady = useRef(false);
  const highlighted = useRef<string[]>([]);
  const currentCfi = useRef<string | null>(options.initialCfi);
  const tapTimer = useRef<number | undefined>(undefined);
  const flashTokens = useRef<ReaderTokens | null>(null);
  const cfiTool = useRef<EpubCFI | null>(null);
  const holdAnchor = useRef(false);
  const anchorAttempts = useRef(0);
  const anchorTimer = useRef<number | undefined>(undefined);

  // Latest options without re-creating the rendition.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  const report = useCallback((location: Location): void => {
    const book = bookRef.current;
    if (!book) return;
    // While the layout settles, keep reporting (and saving) the page the reader chose, not the drifted one.
    const anchor = holdAnchor.current ? currentCfi.current : null;
    const cfi = anchor ?? location.start.cfi;
    currentCfi.current = cfi;

    let page: number | null = null;
    let totalPages: number | null = null;
    let progress = location.start.percentage ?? 0;
    if (locationsReady.current) {
      const index: unknown = book.locations.locationFromCfi(cfi);
      totalPages = book.locations.length();
      if (typeof index === 'number' && totalPages > 0) {
        page = index + 1;
        progress = book.locations.percentageFromCfi(cfi);
      }
    }

    latest.current.onRelocated({
      cfi,
      endCfi: location.end.cfi,
      href: location.start.href,
      progress: Math.min(1, Math.max(0, progress)),
      page,
      totalPages,
      chapter: chapterFor(book.navigation?.toc ?? [], location.start.href),
      atStart: location.atStart,
      atEnd: location.atEnd,
    });
  }, []);

  /** The reader navigated on purpose: whatever page comes next is the new position. */
  const cancelAnchorHold = useCallback((): void => {
    window.clearTimeout(anchorTimer.current);
    holdAnchor.current = false;
    anchorAttempts.current = 0;
  }, []);

  const releaseAnchorAfter = useCallback((ms: number): void => {
    window.clearTimeout(anchorTimer.current);
    anchorTimer.current = window.setTimeout(() => {
      holdAnchor.current = false;
      anchorAttempts.current = 0;
    }, ms);
  }, []);

  const displayAnchor = useCallback((): void => {
    const rendition = renditionRef.current;
    const cfi = currentCfi.current;
    if (!rendition || !cfi) {
      cancelAnchorHold();
      return;
    }
    anchorAttempts.current += 1;
    releaseAnchorAfter(ANCHOR_GIVE_UP_MS); // never hold forever, whatever epub.js does
    rendition.display(cfi).catch(() => cancelAnchorHold());
  }, [cancelAnchorHold, releaseAnchorAfter]);

  /** Holds the reader's position through a re-layout and displays it again once the layout settles. */
  const restoreAnchor = useCallback((delay: number): void => {
    holdAnchor.current = true;
    anchorAttempts.current = 0;
    window.clearTimeout(anchorTimer.current);
    anchorTimer.current = window.setTimeout(displayAnchor, delay);
  }, [displayAnchor]);

  /** After a corrective display: done if the page shows the anchor, otherwise try again (bounded). */
  const checkAnchor = useCallback((location: Location): void => {
    if (!holdAnchor.current || anchorAttempts.current === 0) return; // still settling; the display comes later
    const anchor = currentCfi.current;
    if (anchor && cfiWithin(cfiTool.current, anchor, location.start.cfi, location.end.cfi)) {
      releaseAnchorAfter(ANCHOR_RELEASE_MS);
    } else if (anchorAttempts.current < ANCHOR_MAX_ATTEMPTS) {
      window.clearTimeout(anchorTimer.current);
      anchorTimer.current = window.setTimeout(displayAnchor, ANCHOR_RETRY_MS);
    }
  }, [displayAnchor, releaseAnchorAfter]);

  useEffect(() => {
    if (!container) return;
    let cancelled = false;
    let touchStart: { x: number; y: number } | null = null;

    const init = async (): Promise<void> => {
      const response = await fetch(`/api/books/${bookId}/file`);
      if (!response.ok) throw new Error(`Could not load book (HTTP ${response.status})`);
      const buffer = await response.arrayBuffer();
      const { default: ePub, EpubCFI: Cfi } = await import('epubjs');
      if (cancelled) return;
      cfiTool.current = new Cfi();

      const book = ePub(buffer);
      bookRef.current = book;
      const rendition = book.renderTo(container, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: 'auto',
        minSpreadWidth: 1000,
        allowScriptedContent: false,
      });
      renditionRef.current = rendition;
      const turn = (target: Rendition, direction: 1 | -1): void => {
        cancelAnchorHold();
        void (direction === 1 ? target.next() : target.prev());
      };

      rendition.hooks.content.register((contents: Contents) => {
        applyStyle(contents, latest.current.css, latest.current.language);
      });

      rendition.on('resized', () => restoreAnchor(RESIZE_SETTLE_MS));

      rendition.on('relocated', (location: Location) => {
        checkAnchor(location);
        report(location);
        latest.current.onSelect(null);
      });

      rendition.on('selected', (cfiRange: string) => {
        const range = rendition.getRange(cfiRange);
        const text = range?.toString().trim();
        const rect = range ? toViewportRect(range) : null;
        if (!range || !text || !rect) return;
        latest.current.onSelect({ cfiRange, text, context: contextFor(range, text), rect });
      });

      rendition.on('click', (event: MouseEvent, contents: Contents) => {
        const selection = contents.window.getSelection();
        if (selection && !selection.isCollapsed) return;
        latest.current.onSelect(null);
        if (event.target instanceof Element && event.target.closest('a')) return;

        const frame = contents.window.frameElement;
        const bounds = container.getBoundingClientRect();
        if (!frame || bounds.width === 0) return;
        const x = frame.getBoundingClientRect().left + event.clientX - bounds.left;
        const ratio = x / bounds.width;
        // Deferred so a click on a highlight (reported separately) can cancel it.
        window.clearTimeout(tapTimer.current);
        tapTimer.current = window.setTimeout(() => {
          if (ratio < 0.25) turn(rendition, -1);
          else if (ratio > 0.75) turn(rendition, 1);
          else latest.current.onToggleChrome();
        }, TAP_DELAY_MS);
      });

      rendition.on('keydown', (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') turn(rendition, -1);
        if (event.key === 'ArrowRight') turn(rendition, 1);
        if (isFullscreenKey(event)) latest.current.onToggleFullscreen();
      });

      rendition.on('touchstart', (event: TouchEvent) => {
        const touch = event.changedTouches[0];
        touchStart = touch ? { x: touch.screenX, y: touch.screenY } : null;
      });
      rendition.on('touchend', (event: TouchEvent) => {
        const touch = event.changedTouches[0];
        if (!touch || !touchStart) return;
        const dx = touch.screenX - touchStart.x;
        const dy = touch.screenY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) turn(rendition, 1);
        else turn(rendition, -1);
      });

      await book.ready;
      if (cancelled) return;
      setToc(book.navigation?.toc ?? []);

      const initialCfi = latest.current.initialCfi;
      try {
        await rendition.display(initialCfi ?? undefined);
        // The first display of a saved position often lands on the chapter start (the section is laid out
        // after the jump is computed). Hold the saved position so that wrong page is never reported or
        // saved, and display it again once the layout has settled.
        if (initialCfi) {
          currentCfi.current = initialCfi;
          restoreAnchor(RESIZE_SETTLE_MS);
        }
      } catch {
        await rendition.display(); // stale CFI → start of book
      }
      if (cancelled) return;
      setStatus('ready');

      // Page numbers: reuse cached locations or generate them once.
      if (latest.current.locationsJson) {
        book.locations.load(latest.current.locationsJson);
      } else {
        await book.locations.generate(LOCATION_CHARS);
        if (cancelled) return;
        latest.current.onLocationsGenerated(book.locations.save());
      }
      locationsReady.current = true;
      const current: unknown = rendition.location;
      if (current && typeof current === 'object' && 'start' in current) {
        report(rendition.location);
      }
    };

    init().catch((error: unknown) => {
      if (cancelled) return;
      console.error('[reader]', error);
      setStatus('error');
    });

    return () => {
      cancelled = true;
      window.clearTimeout(anchorTimer.current);
      holdAnchor.current = false;
      locationsReady.current = false;
      highlighted.current = [];
      renditionRef.current = null;
      bookRef.current?.destroy();
      bookRef.current = null;
    };
  }, [bookId, container, report, restoreAnchor, cancelAnchorHold, checkAnchor]);

  // Re-style open iframes when the theme or typography changes, then
  // re-anchor so the reader stays on the same passage after re-pagination.
  const { css } = options;
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || status !== 'ready') return;
    contentsList(rendition).forEach((contents) => applyStyle(contents, css, latest.current.language));
    restoreAnchor(60);
  }, [css, status, restoreAnchor]);

  // Arrow keys (and "f") when focus is outside the iframe.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, [role="dialog"]')) return;
      if (event.key === 'ArrowLeft') {
        cancelAnchorHold();
        void renditionRef.current?.prev();
      }
      if (event.key === 'ArrowRight') {
        cancelAnchorHold();
        void renditionRef.current?.next();
      }
      if (isFullscreenKey(event)) latest.current.onToggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelAnchorHold]);

  const renderHighlights = useCallback((annotations: BookAnnotation[], tokens: ReaderTokens): void => {
    const rendition = renditionRef.current;
    flashTokens.current = tokens;
    if (!rendition) return;
    highlighted.current.forEach((cfi) => rendition.annotations.remove(cfi, 'highlight'));
    highlighted.current = [];
    for (const annotation of annotations) {
      const onClick = (): void => {
        window.clearTimeout(tapTimer.current);
        const range = rendition.getRange(annotation.cfi_range);
        const rect = range ? toViewportRect(range) : null;
        if (rect) latest.current.onHighlightClick(annotation.id, rect);
      };
      rendition.annotations.highlight(
        annotation.cfi_range,
        { id: annotation.id },
        onClick,
        'nc-highlight',
        highlightStyles(tokens, annotation.color)
      );
      highlighted.current.push(annotation.cfi_range);
    }
  }, []);

  /**
   * Jumps to a passage known only by its section (zip path, from the server)
   * and its opening words, then flashes it. Falls back to the section start.
   */
  const goToPassage = useCallback(async (sectionPath: string, locator: string): Promise<void> => {
    const book = bookRef.current;
    const rendition = renditionRef.current;
    if (!book || !rendition) return;

    const target = decodeURIComponent(sectionPath);
    const items: Section[] = [];
    book.spine.each((item: Section) => items.push(item));
    const section = items.find((item) => {
      const href = decodeURIComponent(item.href);
      return target === href || target.endsWith(`/${href}`);
    });
    if (!section) return;

    let cfi: string | null = null;
    try {
      await section.load(book.load.bind(book));
      const words = locator.split(/\s+/).filter(Boolean);
      // find() matches inside a single text node, so try shorter phrases too.
      for (const query of [locator.slice(0, 60), words.slice(0, 6).join(' '), words.slice(0, 3).join(' ')]) {
        if (query.length < 8) continue;
        const matches: unknown = section.find(query);
        const first: unknown = Array.isArray(matches) ? matches[0] : null;
        if (first && typeof first === 'object' && 'cfi' in first && typeof first.cfi === 'string') {
          cfi = first.cfi;
          break;
        }
      }
    } catch (error) {
      console.error('[reader] passage lookup', error);
    }

    cancelAnchorHold();
    await rendition.display(cfi ?? section.href);
    if (cfi && flashTokens.current) {
      const flashCfi = cfi;
      rendition.annotations.highlight(flashCfi, {}, () => undefined, 'nc-flash', highlightStyles(flashTokens.current, 'yellow'));
      window.setTimeout(() => rendition.annotations.remove(flashCfi, 'highlight'), FLASH_MS);
    }
  }, [cancelAnchorHold]);

  const pageExcerpt = useCallback((): string | null => {
    const rendition = renditionRef.current;
    const current: unknown = rendition?.location;
    if (!rendition || !current || typeof current !== 'object' || !('start' in current)) return null;
    const { start, end } = rendition.location;
    try {
      const from = rendition.getRange(start.cfi);
      const to = rendition.getRange(end.cfi);
      const doc = from?.startContainer.ownerDocument;
      if (!from || !doc) return null;
      const range = doc.createRange();
      range.setStart(from.startContainer, from.startOffset);
      if (to && to.startContainer.ownerDocument === doc) range.setEnd(to.startContainer, to.startOffset);
      else range.setEndAfter(doc.body.lastChild ?? from.startContainer);
      const text = range.toString().replace(/\s+/g, ' ').trim();
      return text ? text.slice(0, EXCERPT_CHARS) : null;
    } catch {
      return null; // a CFI the current layout cannot resolve: the bookmark still works without an excerpt
    }
  }, []);

  const isOnPage = useCallback((cfi: string, location: ReaderLocation): boolean => {
    return cfi === location.cfi || cfiWithin(cfiTool.current, cfi, location.cfi, location.endCfi);
  }, []);

  const clearSelection = useCallback((): void => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    contentsList(rendition).forEach((contents) => contents.window.getSelection()?.removeAllRanges());
  }, []);

  return {
    status,
    toc,
    next: useCallback(() => {
      cancelAnchorHold();
      void renditionRef.current?.next();
    }, [cancelAnchorHold]),
    prev: useCallback(() => {
      cancelAnchorHold();
      void renditionRef.current?.prev();
    }, [cancelAnchorHold]),
    display: useCallback((target: string) => {
      cancelAnchorHold();
      void renditionRef.current?.display(target);
    }, [cancelAnchorHold]),
    goToPassage,
    clearSelection,
    renderHighlights,
    pageExcerpt,
    isOnPage,
  };
}
