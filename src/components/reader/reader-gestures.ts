/**
 * reader-gestures.ts — pure rules for turning pages and reacting to selections.
 *
 * Kept free of DOM and epub.js so the rules that decide "turn the page or not"
 * are unit tested (src/components/reader/reader-gestures.test.ts).
 */

export type PageDirection = 1 | -1;

export const SWIPE_MIN_PX = 50;
/** Movement below this is a finger resting, not a drag. */
export const TOUCH_SLOP_PX = 10;
/** Resting this long before moving is a long-press (it selects text), so the drag that follows is never a swipe. */
export const LONG_PRESS_MS = 400;

export interface TouchGesture {
  dx: number;
  dy: number;
  /** How long the finger rested before it started to move (the whole touch when it never moved). */
  holdMs: number;
  /** The selection changed (a word was picked or a handle dragged) while the finger was down. */
  selectionChanged: boolean;
  /** Text is selected when the finger lifts. */
  selectionActive: boolean;
}

/** Page direction for a horizontal swipe, or null when the touch was a tap, a scroll or a selection. */
export function swipeDirection(gesture: TouchGesture): PageDirection | null {
  if (gesture.selectionChanged || gesture.selectionActive) return null;
  if (gesture.holdMs >= LONG_PRESS_MS) return null;
  if (Math.abs(gesture.dx) < SWIPE_MIN_PX || Math.abs(gesture.dx) <= Math.abs(gesture.dy)) return null;
  return gesture.dx < 0 ? 1 : -1;
}

/** While a selection is being dragged past the page edge, holding this long turns the page. */
export const EDGE_HOLD_MS = 600;
/** The push must still be going on: the last blocked scroll happened this recently. */
export const EDGE_ACTIVE_MS = 250;
/** After an edge turn, pushes the other way are ignored for this long (the focus is briefly off-page). */
export const EDGE_COOLDOWN_MS = 800;

export interface EdgePush {
  direction: PageDirection;
  startedAt: number;
  lastAt: number;
}

/**
 * Records a blocked autoscroll toward `direction` (the browser tried to scroll the
 * book while a selection was being dragged). Returns the push to keep.
 */
export function recordEdgePush(current: EdgePush | null, direction: PageDirection, now: number): EdgePush {
  if (current && current.direction === direction && now - current.lastAt <= EDGE_ACTIVE_MS) {
    return { ...current, lastAt: now };
  }
  return { direction, startedAt: now, lastAt: now };
}

/** True when a push has been held long enough, and is still going, to turn the page. */
export function edgePushReady(push: EdgePush | null, now: number): boolean {
  if (!push) return false;
  return now - push.startedAt >= EDGE_HOLD_MS && now - push.lastAt <= EDGE_ACTIVE_MS;
}

export interface LastEdgeTurn {
  direction: PageDirection;
  at: number;
}

export function edgePushAllowed(direction: PageDirection, lastTurn: LastEdgeTurn | null, now: number): boolean {
  if (!lastTurn || lastTurn.direction === direction) return true;
  return now - lastTurn.at > EDGE_COOLDOWN_MS;
}

export interface DisplayedPages {
  /** Page of the section shown at the start / end of the view (1-based). */
  startPage: number;
  endPage: number;
  total: number;
}

/**
 * A selection lives in one section's iframe: turning past the section boundary
 * loads another iframe and loses it. So edge turns stay inside the section.
 */
export function canTurnWithinSection(direction: PageDirection, pages: DisplayedPages): boolean {
  return direction === 1 ? pages.endPage < pages.total : pages.startPage > 1;
}

const WORD = /^[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*$/u;
const EDGE_PUNCTUATION = /^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu;
const MAX_WORD_CHARS = 48;

/** The single word a selection consists of (outer punctuation removed), or null for a phrase. */
export function lookupWord(text: string): string | null {
  const word = text.replace(EDGE_PUNCTUATION, '');
  if (!word || word.length > MAX_WORD_CHARS || !WORD.test(word)) return null;
  if (/^\p{N}+$/u.test(word)) return null; // a bare number has no dictionary entry
  return word;
}
