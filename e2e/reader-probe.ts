import { expect, type Page } from '@playwright/test';

import { BOOK_ID } from './env';
import { fixtureEpub } from './fixtures/epub';

/**
 * Helpers that read the epub.js iframe from the parent page (the iframe is same-origin).
 * Coordinates are viewport coordinates of the main page.
 */

export interface WordBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProbeApi {
  scrollLeft: () => number;
  pageWidth: () => number;
  visibleWords: () => WordBox[];
  select: (from: number, to: number) => WordBox | null;
  selectionText: () => string;
  pushScroll: (delta: number) => void;
  blurredElements: () => string[];
}

declare global {
  interface Window {
    e2eProbe?: ProbeApi;
  }
}

function installProbe(): void {
  const scroller = (): HTMLElement | null => document.querySelector<HTMLElement>('.epub-container');
  const frame = (): HTMLIFrameElement | null => document.querySelector<HTMLIFrameElement>('.epub-container iframe');

  interface WordRange extends WordBox {
    range: Range;
  }

  const words = (): WordRange[] => {
    const element = frame();
    const box = scroller()?.getBoundingClientRect();
    const doc = element?.contentDocument;
    if (!element || !box || !doc) return [];
    const offset = element.getBoundingClientRect();
    const out: WordRange[] = [];
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node && out.length < 600; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      for (const match of text.matchAll(/\p{L}+/gu)) {
        const range = doc.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        // Hyphenated words wrap onto two lines; only single-line words have a meaningful position.
        const rects = range.getClientRects();
        if (rects.length !== 1) continue;
        const rect = rects[0];
        const x = offset.left + rect.left;
        const y = offset.top + rect.top;
        if (rect.width === 0 || x < box.left + 1 || x + rect.width > box.right - 1 || y < box.top || y + rect.height > box.bottom) {
          continue;
        }
        out.push({ text: match[0], x, y, width: rect.width, height: rect.height, range });
      }
    }
    return out;
  };

  window.e2eProbe = {
    scrollLeft: () => scroller()?.scrollLeft ?? -1,
    pageWidth: () => scroller()?.clientWidth ?? -1,
    visibleWords: () => words().map(({ text, x, y, width, height }) => ({ text, x, y, width, height })),
    select: (from, to) => {
      const list = words();
      const first = list[from];
      const last = list[to];
      const doc = frame()?.contentDocument;
      if (!first || !last || !doc) return null;
      const range = doc.createRange();
      range.setStart(first.range.startContainer, first.range.startOffset);
      range.setEnd(last.range.endContainer, last.range.endOffset);
      const selection = doc.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return { text: range.toString(), x: first.x, y: first.y, width: last.x + last.width - first.x, height: first.height };
    },
    selectionText: () => frame()?.contentDocument?.getSelection()?.toString() ?? '',
    pushScroll: (delta) => {
      const element = scroller();
      if (element) element.scrollLeft += delta;
    },
    blurredElements: () =>
      Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .filter((element) => {
          const style = getComputedStyle(element);
          const backdrop = style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter');
          return (backdrop && backdrop !== 'none') || (style.filter && style.filter !== 'none');
        })
        .map((element) => element.tagName.toLowerCase() + (element.dataset.slot ? `[${element.dataset.slot}]` : '')),
  };
}

/** Opens the fixture book (served from memory) with a fake dictionary; resolves once text is on screen. */
export async function openReader(page: Page): Promise<void> {
  const epub = await fixtureEpub();
  await page.route(`**/api/books/${BOOK_ID}/file`, (route) =>
    route.fulfill({ body: epub, contentType: 'application/epub+zip' })
  );
  await page.route('**/api/dictionary?**', (route) => {
    const word = new URL(route.request().url()).searchParams.get('word') ?? '';
    return route.fulfill({
      json: {
        data: {
          word,
          entries: [
            {
              word,
              language: 'English',
              partOfSpeech: 'Noun',
              senses: [{ definition: `Definition of ${word}.`, examples: [`An example with ${word}.`] }],
            },
          ],
          source_url: `https://en.wiktionary.org/wiki/${word}`,
        },
        error: null,
      },
    });
  });
  await page.goto(`/read/${BOOK_ID}`);
  await expect(page.getByTestId('page-label')).toHaveText(/\d/, { timeout: 60_000 });
  await page.evaluate(installProbe);
  await expect.poll(() => page.evaluate(() => window.e2eProbe?.visibleWords().length ?? 0)).toBeGreaterThan(20);
  // The first display re-anchors once the layout settles; let it finish before measuring.
  await page.waitForTimeout(800);
}

export const probe = {
  scrollLeft: (page: Page): Promise<number> => page.evaluate(() => window.e2eProbe?.scrollLeft() ?? -1),
  pageWidth: (page: Page): Promise<number> => page.evaluate(() => window.e2eProbe?.pageWidth() ?? -1),
  words: (page: Page): Promise<WordBox[]> => page.evaluate(() => window.e2eProbe?.visibleWords() ?? []),
  select: (page: Page, from: number, to: number = from): Promise<WordBox | null> =>
    page.evaluate(([a, b]) => window.e2eProbe?.select(a, b) ?? null, [from, to] as const),
  selectionText: (page: Page): Promise<string> => page.evaluate(() => window.e2eProbe?.selectionText() ?? ''),
  blurred: (page: Page): Promise<string[]> => page.evaluate(() => window.e2eProbe?.blurredElements() ?? []),
  /** Simulates the browser autoscrolling the book (what a selection handle dragged to the edge does). */
  pushFor: (page: Page, delta: number, durationMs: number): Promise<void> =>
    page.evaluate(
      ([step, ms]) =>
        new Promise<void>((resolve) => {
          const started = Date.now();
          const timer = window.setInterval(() => {
            window.e2eProbe?.pushScroll(step);
            if (Date.now() - started >= ms) {
              window.clearInterval(timer);
              resolve();
            }
          }, 30);
        }),
      [delta, durationMs] as const
    ),
};
