import { describe, expect, it } from 'vitest';

import {
  EDGE_ACTIVE_MS,
  EDGE_COOLDOWN_MS,
  EDGE_HOLD_MS,
  LONG_PRESS_MS,
  canTurnWithinSection,
  edgePushAllowed,
  edgePushReady,
  lookupWord,
  recordEdgePush,
  swipeDirection,
  type TouchGesture,
} from '@/components/reader/reader-gestures';

const swipe = (overrides: Partial<TouchGesture>): TouchGesture => ({
  dx: -120,
  dy: 5,
  holdMs: 40,
  selectionChanged: false,
  selectionActive: false,
  ...overrides,
});

describe('swipeDirection', () => {
  it('turns forward on a quick swipe left and back on a swipe right', () => {
    expect(swipeDirection(swipe({ dx: -120 }))).toBe(1);
    expect(swipeDirection(swipe({ dx: 120 }))).toBe(-1);
  });

  it('ignores taps and short drags', () => {
    expect(swipeDirection(swipe({ dx: 0, dy: 0 }))).toBeNull();
    expect(swipeDirection(swipe({ dx: -30 }))).toBeNull();
  });

  it('ignores mostly vertical movement', () => {
    expect(swipeDirection(swipe({ dx: -80, dy: 120 }))).toBeNull();
  });

  it('never turns while a selection is being made or is active', () => {
    // Dragging a selection handle sideways used to turn the page and drop the selection.
    expect(swipeDirection(swipe({ selectionChanged: true }))).toBeNull();
    expect(swipeDirection(swipe({ selectionActive: true }))).toBeNull();
  });

  it('treats a long press followed by a drag as a selection, not a swipe', () => {
    expect(swipeDirection(swipe({ holdMs: LONG_PRESS_MS }))).toBeNull();
  });

  it('accepts a slow swipe that starts moving right away', () => {
    expect(swipeDirection(swipe({ holdMs: 30 }))).toBe(1);
  });
});

describe('edge push (dragging a selection past the page edge)', () => {
  it('turns only after the push is held, and only while it continues', () => {
    let push = recordEdgePush(null, 1, 0);
    expect(edgePushReady(push, 100)).toBe(false);
    // The browser keeps trying to autoscroll every few frames while the handle is held at the edge.
    for (let now = 50; now <= EDGE_HOLD_MS; now += 50) push = recordEdgePush(push, 1, now);
    expect(edgePushReady(push, EDGE_HOLD_MS)).toBe(true);
  });

  it('does not turn when the finger left the edge before the hold elapsed', () => {
    const push = recordEdgePush(null, 1, 0);
    expect(edgePushReady(push, EDGE_HOLD_MS)).toBe(false); // last push at 0, long ago
  });

  it('restarts the hold when the direction flips or the push pauses', () => {
    const forward = recordEdgePush(null, 1, 0);
    expect(recordEdgePush(forward, -1, 100)).toEqual({ direction: -1, startedAt: 100, lastAt: 100 });
    expect(recordEdgePush(forward, 1, EDGE_ACTIVE_MS + 1).startedAt).toBe(EDGE_ACTIVE_MS + 1);
  });

  it('ignores the opposite direction right after an edge turn', () => {
    const lastTurn = { direction: 1 as const, at: 1000 };
    expect(edgePushAllowed(-1, lastTurn, 1000 + EDGE_COOLDOWN_MS - 1)).toBe(false);
    expect(edgePushAllowed(-1, lastTurn, 1000 + EDGE_COOLDOWN_MS + 1)).toBe(true);
    expect(edgePushAllowed(1, lastTurn, 1001)).toBe(true);
  });

  it('stays inside the section, where the selection lives', () => {
    expect(canTurnWithinSection(1, { startPage: 3, endPage: 3, total: 5 })).toBe(true);
    expect(canTurnWithinSection(1, { startPage: 5, endPage: 5, total: 5 })).toBe(false);
    expect(canTurnWithinSection(-1, { startPage: 1, endPage: 2, total: 5 })).toBe(false);
    expect(canTurnWithinSection(-1, { startPage: 3, endPage: 4, total: 5 })).toBe(true);
  });
});

describe('lookupWord', () => {
  it('accepts a single word, trimming outer punctuation', () => {
    expect(lookupWord('early')).toBe('early');
    expect(lookupWord(' “early,” ')).toBe('early');
    expect(lookupWord('don’t')).toBe('don’t');
    expect(lookupWord('well-known')).toBe('well-known');
    expect(lookupWord('niño')).toBe('niño');
  });

  it('rejects phrases, numbers and empty selections', () => {
    expect(lookupWord('early in your life')).toBeNull();
    expect(lookupWord('word\nword')).toBeNull();
    expect(lookupWord('1885')).toBeNull();
    expect(lookupWord('…')).toBeNull();
    expect(lookupWord('')).toBeNull();
  });
});
