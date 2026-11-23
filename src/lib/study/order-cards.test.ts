import { describe, expect, it } from 'vitest';
import { MAX_NEW_CARDS_PER_SESSION, orderStudyCards, type OrderableStudyCard } from './order-cards';

const NOW = new Date('2026-11-23T12:00:00.000Z');
const PAST = new Date('2026-11-22T12:00:00.000Z');
const FUTURE = new Date('2026-11-24T12:00:00.000Z');

type Item = OrderableStudyCard & { id: string };

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('orderStudyCards (AGENTS.md §6.3)', () => {
  it('orders the five buckets and drops cards that are not due', () => {
    const items: Item[] = [
      { id: 'new',        state: 'new',        stability: 0,  due_date: FUTURE },
      { id: 'mastered',   state: 'review',     stability: 80, due_date: PAST },
      { id: 'inter',      state: 'review',     stability: 10, due_date: PAST },
      { id: 'struggling', state: 'review',     stability: 9.9, due_date: PAST },
      { id: 'relearn',    state: 'relearning', stability: 3,  due_date: PAST },
      { id: 'learn',      state: 'learning',   stability: 1,  due_date: NOW },
      { id: 'notDueRev',  state: 'review',     stability: 5,  due_date: FUTURE },
      { id: 'notDueLrn',  state: 'learning',   stability: 1,  due_date: FUTURE },
      { id: 'boundary50', state: 'review',     stability: 50, due_date: PAST },
    ];

    const ordered = orderStudyCards(items, NOW, seeded(1)).map((i) => i.id);
    expect(ordered).toEqual(['relearn', 'learn', 'struggling', 'inter', 'mastered', 'boundary50', 'new']);
  });

  it('accepts ISO strings as due dates (offline snapshot)', () => {
    const items: Item[] = [
      { id: 'b', state: 'review', stability: 60, due_date: PAST.toISOString() },
      { id: 'a', state: 'review', stability: 1, due_date: PAST.toISOString() },
      { id: 'c', state: 'review', stability: 1, due_date: FUTURE.toISOString() },
    ];
    expect(orderStudyCards(items, NOW).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it(`caps new cards at ${MAX_NEW_CARDS_PER_SESSION} and keeps them after due cards`, () => {
    const fresh: Item[] = Array.from({ length: 35 }, (_, i) => ({
      id: `n${i}`, state: 'new' as const, stability: 0, due_date: NOW,
    }));
    const due: Item = { id: 'due', state: 'review', stability: 1, due_date: PAST };

    const ordered = orderStudyCards([...fresh, due], NOW, seeded(7));
    expect(ordered).toHaveLength(MAX_NEW_CARDS_PER_SESSION + 1);
    expect(ordered[0].id).toBe('due');
    expect(new Set(ordered.map((i) => i.id)).size).toBe(ordered.length);
  });

  it('shuffles new cards deterministically for a given rng and leaves the input untouched', () => {
    const fresh: Item[] = Array.from({ length: 10 }, (_, i) => ({
      id: `n${i}`, state: 'new' as const, stability: 0, due_date: NOW,
    }));
    const snapshot = fresh.map((i) => i.id);

    const a = orderStudyCards(fresh, NOW, seeded(42)).map((i) => i.id);
    const b = orderStudyCards(fresh, NOW, seeded(42)).map((i) => i.id);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([...snapshot].sort());
    expect(fresh.map((i) => i.id)).toEqual(snapshot);
  });

  it('rng = 0 swaps each element with the first (Fisher-Yates, not a biased sort)', () => {
    const fresh: Item[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, state: 'new' as const, stability: 0, due_date: NOW }));
    // i=3,j=0: d b c a · i=2,j=0: c b d a · i=1,j=0: b c d a
    expect(orderStudyCards(fresh, NOW, () => 0).map((i) => i.id)).toEqual(['b', 'c', 'd', 'a']);
  });
});
