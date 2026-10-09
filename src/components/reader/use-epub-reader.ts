'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Book, Contents, EpubCFI, Location, NavItem, Rendition } from 'epubjs';
import type { RenditionOptions } from 'epubjs/types/rendition';
import type Section from 'epubjs/types/section';

import type { BookAnnotation } from '@/lib/services/annotation-service';
import { highlightStyles, type ReaderTokens } from '@/components/reader/reader-theme';
import {
  EDGE_ACTIVE_MS,
  EDGE_HOLD_MS,
  TOUCH_SLOP_PX,
  canTurnWithinSection,
  edgePushAllowed,
  edgePushReady,
  recordEdgePush,
  swipeDirection,
  type EdgePush,
  type LastEdgeTurn,
  type PageDirection,
} from '@/components/reader/reader-gestures';
import { sanitizeSection } from '@/components/reader/sanitize-section';

/**
 * use-epub-reader.ts — owns the epub.js Book/Rendition lifecycle.
 *
 * The EPUB binary is fetched client-side because epub.js renders it in the
 * browser; everything the page *shows* besides the book itself comes from the
 * server component. Callbacks are held in refs so the rendition is created once.
 */

const LOCATION_CHARS = 1600; // ≈ one printed page; stable across font sizes
const STYLE_ID = 'nc-reader-style';
const TAP_DELAY_MS = 80;
// A selection is reported once it stops changing and the finger is up, so the toolbar
// and the lookup panel never jump around while a handle is being dragged.
const SELECTION_SETTLE_MS = 350;
const SELECTION_AFTER_POINTER_UP_MS = 120;
const EDGE_POLL_MS = 50;
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
  /** A settled selection, or null while there is none or it is still being dragged. */
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
  /** Two pages side by side on wide screens; otherwise one column fills the page (the default). */
  twoPages: boolean;
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
// Space between columns, half of it padding on each side of the text. epub.js defaults to width / 12,
// which on a phone (already inside the page-turn margins) wastes ~7% of the width. Spreads keep it.
const TOUCH_GAP_PX = 16;
const SPREAD_MIN_WIDTH = 1000;

/** epub.js reads `gap` from the rendition settings but its typings leave it out. */
type RenderOptions = RenditionOptions & { gap?: number };

function spreadMode(twoPages: boolean): 'auto' | 'none' {
  return twoPages ? 'auto' : 'none';
}

function columnGap(container: HTMLElement): number | undefined {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  return touch && container.clientWidth < SPREAD_MIN_WIDTH ? TOUCH_GAP_PX : undefined;
}

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

/** True when the selection runs from anchor to focus in document order (the focus is its end). */
function isForward(selection: Selection, doc: Document): boolean {
  if (!selection.anchorNode || !selection.focusNode) return true;
  const probe = doc.createRange();
  probe.setStart(selection.anchorNode, selection.anchorOffset);
  probe.setEnd(selection.focusNode, selection.focusOffset); // collapses when the focus comes first
  return !probe.collapsed || (selection.anchorNode === selection.focusNode && selection.anchorOffset <= selection.focusOffset);
}

/** Viewport x of the selection's moving end (its focus). */
function focusX(range: Range, forward: boolean): number | null {
  const frame = range.startContainer.ownerDocument?.defaultView?.frameElement;
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 || rect.height > 0);
  const edge = forward ? rects.at(-1) : rects[0];
  if (!frame || !edge) return null;
  return frame.getBoundingClientRect().left + (forward ? edge.right : edge.left);
}

const MARKS_REPAINT_MS = 50;

/**
 * Forces the browser to repaint epub.js's marks pane (the SVG over the page that draws highlights).
 * In desktop full screen a newly added mark can stay unpainted until the next resize — it exists
 * in the DOM but only shows after leaving full screen. A brief compositing change repaints it.
 */
function repaintMarks(root: HTMLElement | null): void {
  const panes = root ? Array.from(root.querySelectorAll<SVGSVGElement>('.epub-view > svg')) : [];
  if (panes.length === 0) return;
  panes.forEach((pane) => pane.style.setProperty('transform', 'translateZ(0)'));
  // A timeout, not rAF: rAF is paused in background tabs and would leave the layer promoted.
  window.setTimeout(() => panes.forEach((pane) => pane.style.removeProperty('transform')), MARKS_REPAINT_MS);
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
  // Selection state. While text is selected the book must not move under the finger: the browser's own
  // autoscroll is always undone, and only the pointer itself held past a side edge turns the page.
  // Autoscroll never counts as a push: on Android a native handle dragged to the top or bottom of the page
  // hit-tests into the neighbouring column, so it looked like a push and flipped page after page.
  const scroller = useRef<HTMLElement | null>(null);
  const selectionActive = useRef(false);
  const selectionReported = useRef(false);
  const pageLeft = useRef(0);
  const edgeTurning = useRef(false);
  const edgePush = useRef<EdgePush | null>(null);
  const lastEdgeTurn = useRef<LastEdgeTurn | null>(null);
  const edgeTimer = useRef<number | undefined>(undefined);
  const settleTimer = useRef<number | undefined>(undefined);
  const pointerDown = useRef(false);
  const pointerSide = useRef<PageDirection | null>(null); // the finger/mouse is past this page edge
  const pageDelta = useRef(0); // scroll distance of one page turn (epub.js layout delta)
  const appliedTwoPages = useRef<boolean | null>(null);

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

  // ── Selection ───────────────────────────────────────────────────────────
  const selectionContents = useRef<Contents | null>(null);
  const ignoreSelectionChange = useRef(false);
  const touchSelectionChanged = useRef(false);

  /** Visible page box (the epub.js scroller), in viewport coordinates. */
  const pageBox = useCallback((): DOMRect | null => scroller.current?.getBoundingClientRect() ?? null, []);

  /** Which side of the page the selection's moving end has left through, if any. */
  const focusOutside = useCallback((contents: Contents): PageDirection | null => {
    const selection = contents.window.getSelection();
    const box = pageBox();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !box) return null;
    const forward = isForward(selection, contents.document);
    const x = focusX(selection.getRangeAt(0), forward);
    if (x === null) return null;
    if (forward && x > box.right + 1) return 1;
    if (!forward && x < box.left - 1) return -1;
    return null;
  }, [pageBox]);

  /** Pulls the moving end back onto the page: text the reader cannot see is never part of the selection. */
  const clampToPage = useCallback((contents: Contents): void => {
    const rendition = renditionRef.current;
    const selection = contents.window.getSelection();
    const side = focusOutside(contents);
    const current: unknown = rendition?.location;
    if (!rendition || !selection || !side || !current || typeof current !== 'object' || !('start' in current)) return;
    try {
      const edge = rendition.getRange(side === 1 ? rendition.location.end.cfi : rendition.location.start.cfi);
      if (!edge || edge.startContainer.ownerDocument !== contents.document) return;
      ignoreSelectionChange.current = true;
      selection.extend(edge.startContainer, edge.startOffset);
    } catch {
      ignoreSelectionChange.current = false; // a CFI this layout cannot resolve: keep the selection as it is
    }
  }, [focusOutside]);

  /** Forgets the selection and stops guarding the page (the DOM selection is left alone). */
  const endSelection = useCallback((): void => {
    selectionActive.current = false;
    selectionContents.current = null;
    edgePush.current = null;
    window.clearTimeout(edgeTimer.current);
    edgeTimer.current = undefined;
    window.clearTimeout(settleTimer.current);
    if (selectionReported.current) {
      selectionReported.current = false;
      latest.current.onSelect(null);
    }
  }, []);

  const reportSelection = useCallback((contents: Contents): void => {
    const selection = contents.window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    clampToPage(contents);
    const range = selection.getRangeAt(0);
    const text = range.toString().trim();
    const rect = toViewportRect(range);
    if (!text || !rect) return;
    let cfiRange: string;
    try {
      cfiRange = contents.cfiFromRange(range);
    } catch {
      return;
    }
    selectionReported.current = true;
    latest.current.onSelect({ cfiRange, text, context: contextFor(range, text), rect });
  }, [clampToPage]);

  /** Reports the selection once it is still, the finger is up and no edge push is pending. */
  const scheduleReport = useCallback((delay: number): void => {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const contents = selectionContents.current;
      if (!contents || !selectionActive.current || pointerDown.current || edgePush.current) return;
      reportSelection(contents);
    }, delay);
  }, [reportSelection]);

  const handleSelectionChange = useCallback((contents: Contents): void => {
    if (ignoreSelectionChange.current) {
      ignoreSelectionChange.current = false;
      return;
    }
    const selection = contents.window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      if (selectionActive.current) endSelection();
      return;
    }
    if (!selectionActive.current) {
      selectionActive.current = true;
      pageLeft.current = scroller.current?.scrollLeft ?? 0;
    }
    selectionContents.current = contents;
    touchSelectionChanged.current = true;
    // Text the reader cannot see never joins the selection, so the browser has nothing off-page to scroll to.
    clampToPage(contents);
    // Hide the toolbar (and the lookup) while the selection is still moving.
    if (selectionReported.current) {
      selectionReported.current = false;
      latest.current.onSelect(null);
    }
    scheduleReport(SELECTION_SETTLE_MS);
  }, [clampToPage, endSelection, scheduleReport]);

  /** Turns the page under a selection, inside its section (the selection lives in that section's iframe). */
  const turnAtEdge = useCallback(async (direction: PageDirection): Promise<void> => {
    const rendition = renditionRef.current;
    const element = scroller.current;
    const current: unknown = rendition?.location;
    if (!rendition || !element || !current || typeof current !== 'object' || !('start' in current)) return;
    const { start, end } = rendition.location;
    const pages = { startPage: start.displayed.page, endPage: end.displayed.page, total: end.displayed.total };
    if (!canTurnWithinSection(direction, pages)) return;
    edgeTurning.current = true;
    lastEdgeTurn.current = { direction, at: Date.now() };
    cancelAnchorHold();
    // The exact page the turn lands on: autoscroll that sneaks in during the turn must not shift it.
    const target = pageDelta.current > 0 ? pageLeft.current + direction * pageDelta.current : null;
    try {
      await (direction === 1 ? rendition.next() : rendition.prev());
    } finally {
      if (target !== null && element.scrollLeft !== target) element.scrollLeft = target;
      pageLeft.current = element.scrollLeft;
      edgeTurning.current = false;
    }
  }, [cancelAnchorHold]);

  /**
   * The pointer dragging a selection went past the page's side edge toward `direction`. Held there long
   * enough, that turns the page; pulled back or let go earlier, nothing moves.
   */
  const pushEdge = useCallback((direction: PageDirection): void => {
    const now = Date.now();
    if (!edgePushAllowed(direction, lastEdgeTurn.current, now)) return;
    edgePush.current = recordEdgePush(edgePush.current, direction, now);
    if (edgeTimer.current !== undefined) return;
    const check = (): void => {
      edgeTimer.current = undefined;
      const push = edgePush.current;
      const contents = selectionContents.current;
      if (!push || !contents || !selectionActive.current) return;
      const at = Date.now();
      // A pointer held still past the edge keeps pushing (pointermove stops firing when it rests).
      if (pointerDown.current && pointerSide.current === push.direction) edgePush.current = { ...push, lastAt: at };
      const live = edgePush.current;
      if (live && edgePushReady(live, at)) {
        edgePush.current = null;
        void turnAtEdge(live.direction).then(() => scheduleReport(SELECTION_SETTLE_MS));
        return;
      }
      if (!live || at - live.lastAt > EDGE_ACTIVE_MS) {
        edgePush.current = null; // let go before the hold elapsed: the page stays
        scheduleReport(SELECTION_AFTER_POINTER_UP_MS);
        return;
      }
      edgeTimer.current = window.setTimeout(check, Math.max(EDGE_POLL_MS, live.startedAt + EDGE_HOLD_MS - at));
    };
    edgeTimer.current = window.setTimeout(check, EDGE_POLL_MS);
  }, [scheduleReport, turnAtEdge]);

  /** Undoes any scroll of the book that the reader did not ask for while text is selected. */
  const guardScroll = useCallback((): void => {
    const element = scroller.current;
    if (!element || !selectionActive.current || edgeTurning.current) return;
    if (Math.abs(element.scrollLeft - pageLeft.current) >= 1) element.scrollLeft = pageLeft.current;
  }, []);

  const clearSelection = useCallback((): void => {
    endSelection();
    const rendition = renditionRef.current;
    if (!rendition) return;
    contentsList(rendition).forEach((contents) => contents.window.getSelection()?.removeAllRanges());
  }, [endSelection]);

  useEffect(() => {
    if (!container) return;
    let cancelled = false;
    let touchStart: { x: number; y: number; at: number; movedAt: number | null } | null = null;

    const init = async (): Promise<void> => {
      const response = await fetch(`/api/books/${bookId}/file`);
      if (!response.ok) throw new Error(`Could not load book (HTTP ${response.status})`);
      const buffer = await response.arrayBuffer();
      const { default: ePub, EpubCFI: Cfi } = await import('epubjs');
      if (cancelled) return;
      cfiTool.current = new Cfi();

      const book = ePub(buffer);
      bookRef.current = book;
      appliedTwoPages.current = latest.current.twoPages;
      const renderOptions: RenderOptions = {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: spreadMode(latest.current.twoPages),
        minSpreadWidth: SPREAD_MIN_WIDTH,
        gap: columnGap(container),
        // Required for WebKit to deliver taps and selections to our listeners; the book's own code
        // never runs (see sanitize-section.ts, registered below before any section is displayed).
        allowScriptedContent: true,
      };
      const rendition = book.renderTo(container, renderOptions);
      renditionRef.current = rendition;
      const turn = (target: Rendition, direction: PageDirection): void => {
        cancelAnchorHold();
        clearSelection();
        void (direction === 1 ? target.next() : target.prev());
      };

      rendition.hooks.content.register((contents: Contents) => {
        applyStyle(contents, latest.current.css, latest.current.language);
        const doc = contents.document;
        // Our own selection pipeline (epub.js's "selected" fires mid-drag and knows nothing about the finger).
        doc.addEventListener('selectionchange', () => handleSelectionChange(contents));
        doc.addEventListener('pointerdown', () => {
          pointerDown.current = true;
        });
        // Dragging a selection (mouse, or long-press then drag) past the side of the page: browsers don't
        // always autoscroll the book for that, so the pointer position itself counts as a push.
        doc.addEventListener('pointermove', (event: PointerEvent) => {
          const frameElement = contents.window.frameElement;
          const box = pageBox();
          if (!pointerDown.current || !selectionActive.current || !frameElement || !box) return;
          const x = frameElement.getBoundingClientRect().left + event.clientX;
          pointerSide.current = x > box.right ? 1 : x < box.left ? -1 : null;
          if (pointerSide.current) pushEdge(pointerSide.current);
        });
        const release = (): void => {
          pointerDown.current = false;
          pointerSide.current = null;
          if (selectionActive.current && !selectionReported.current) scheduleReport(SELECTION_AFTER_POINTER_UP_MS);
        };
        doc.addEventListener('pointerup', release);
        doc.addEventListener('pointercancel', release);
      });

      rendition.on('layout', (props: unknown) => {
        if (props && typeof props === 'object' && 'delta' in props && typeof props.delta === 'number') {
          pageDelta.current = props.delta;
        }
      });

      rendition.on('resized', () => {
        clearSelection(); // the layout moves under it
        restoreAnchor(RESIZE_SETTLE_MS);
      });

      rendition.on('relocated', (location: Location) => {
        checkAnchor(location);
        report(location);
        if (!selectionActive.current) latest.current.onSelect(null);
      });

      // A tap on the text never turns the page (only the side margins and swipes do): it toggles the chrome.
      rendition.on('click', (event: MouseEvent, contents: Contents) => {
        const selection = contents.window.getSelection();
        if (selection && !selection.isCollapsed) return;
        if (event.target instanceof Element && event.target.closest('a')) return;
        // Deferred so a click on a highlight (reported separately) can cancel it.
        window.clearTimeout(tapTimer.current);
        tapTimer.current = window.setTimeout(() => latest.current.onToggleChrome(), TAP_DELAY_MS);
      });

      rendition.on('keydown', (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') turn(rendition, -1);
        if (event.key === 'ArrowRight') turn(rendition, 1);
        if (isFullscreenKey(event)) latest.current.onToggleFullscreen();
      });

      rendition.on('touchstart', (event: TouchEvent) => {
        const touch = event.changedTouches[0];
        touchStart =
          touch && event.touches.length === 1 ? { x: touch.screenX, y: touch.screenY, at: Date.now(), movedAt: null } : null;
        touchSelectionChanged.current = false;
      });
      rendition.on('touchmove', (event: TouchEvent) => {
        const touch = event.changedTouches[0];
        if (!touch || !touchStart || touchStart.movedAt !== null) return;
        const moved = Math.hypot(touch.screenX - touchStart.x, touch.screenY - touchStart.y);
        if (moved > TOUCH_SLOP_PX) touchStart.movedAt = Date.now();
      });
      rendition.on('touchend', (event: TouchEvent) => {
        const touch = event.changedTouches[0];
        if (!touch || !touchStart) return;
        const direction = swipeDirection({
          dx: touch.screenX - touchStart.x,
          dy: touch.screenY - touchStart.y,
          holdMs: (touchStart.movedAt ?? Date.now()) - touchStart.at,
          selectionChanged: touchSelectionChanged.current,
          selectionActive: selectionActive.current,
        });
        touchStart = null;
        if (direction) turn(rendition, direction);
      });

      await book.ready;
      if (cancelled) return;
      // After book.ready, so it runs after epub.js swaps resource URLs (that hook rewrites the output).
      book.spine.hooks.serialize.register((_output: string, section: Section) => {
        section.output = sanitizeSection(section.output);
      });
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
      // epub.js pages by scrolling this element horizontally; guard it while text is selected.
      const element = container.querySelector<HTMLElement>('.epub-container');
      if (element) {
        scroller.current = element;
        element.addEventListener('scroll', guardScroll);
      }
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
      endSelection();
      scroller.current?.removeEventListener('scroll', guardScroll);
      scroller.current = null;
      holdAnchor.current = false;
      locationsReady.current = false;
      highlighted.current = [];
      renditionRef.current = null;
      bookRef.current?.destroy();
      bookRef.current = null;
    };
  }, [
    bookId,
    container,
    report,
    restoreAnchor,
    cancelAnchorHold,
    checkAnchor,
    clearSelection,
    endSelection,
    guardScroll,
    handleSelectionChange,
    pageBox,
    pushEdge,
    scheduleReport,
  ]);

  // Re-style open iframes when the theme or typography changes, then
  // re-anchor so the reader stays on the same passage after re-pagination.
  const { css } = options;
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || status !== 'ready') return;
    contentsList(rendition).forEach((contents) => applyStyle(contents, css, latest.current.language));
    restoreAnchor(60);
  }, [css, status, restoreAnchor]);

  // One column or two pages: epub.js re-paginates, so hold the reader's place through it.
  const { twoPages } = options;
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || status !== 'ready' || appliedTwoPages.current === twoPages) return;
    appliedTwoPages.current = twoPages;
    clearSelection();
    rendition.spread(spreadMode(twoPages), SPREAD_MIN_WIDTH);
    restoreAnchor(RESIZE_SETTLE_MS);
  }, [twoPages, status, clearSelection, restoreAnchor]);

  // Arrow keys (and "f") when focus is outside the iframe.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, [role="dialog"]')) return;
      if (event.key === 'ArrowLeft') {
        cancelAnchorHold();
        clearSelection();
        void renditionRef.current?.prev();
      }
      if (event.key === 'ArrowRight') {
        cancelAnchorHold();
        clearSelection();
        void renditionRef.current?.next();
      }
      if (isFullscreenKey(event)) latest.current.onToggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelAnchorHold, clearSelection]);

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
    repaintMarks(latest.current.container);
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


  return {
    status,
    toc,
    next: useCallback(() => {
      cancelAnchorHold();
      clearSelection();
      void renditionRef.current?.next();
    }, [cancelAnchorHold, clearSelection]),
    prev: useCallback(() => {
      cancelAnchorHold();
      clearSelection();
      void renditionRef.current?.prev();
    }, [cancelAnchorHold, clearSelection]),
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
