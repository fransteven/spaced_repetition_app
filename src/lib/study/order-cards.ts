/**
 * Study session ordering, AGENTS.md §6.3 (strict — do not reorder). Pure and dependency-free:
 * the server (getStudySession) and the offline study shell build the queue with this same function.
 */

export interface OrderableStudyCard {
  state:     'new' | 'learning' | 'review' | 'relearning';
  stability: number;
  due_date:  Date | string;
}

export const MAX_NEW_CARDS_PER_SESSION = 20;

function shuffle<T>(items: T[], rng: () => number): T[] {
  // Fisher-Yates: unbiased, unlike sort(() => rng() - 0.5).
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * 1. learning/relearning due · 2. review due, S < 10 · 3. review due, 10 ≤ S < 50 ·
 * 4. review due, S ≥ 50 · 5. new (shuffled, max 20). Anything else (not due) is left out.
 */
export function orderStudyCards<T extends OrderableStudyCard>(
  items: readonly T[],
  now: Date,
  rng: () => number = Math.random,
): T[] {
  const nowMs = now.getTime();
  const learning: T[] = [];
  const struggling: T[] = [];
  const intermediate: T[] = [];
  const mastered: T[] = [];
  const fresh: T[] = [];

  for (const item of items) {
    const isDue = new Date(item.due_date).getTime() <= nowMs;
    if ((item.state === 'learning' || item.state === 'relearning') && isDue) {
      learning.push(item);
    } else if (item.state === 'review' && isDue && item.stability < 10) {
      struggling.push(item);
    } else if (item.state === 'review' && isDue && item.stability >= 10 && item.stability < 50) {
      intermediate.push(item);
    } else if (item.state === 'review' && isDue && item.stability >= 50) {
      mastered.push(item);
    } else if (item.state === 'new') {
      fresh.push(item);
    }
  }

  return [
    ...learning,
    ...struggling,
    ...intermediate,
    ...mastered,
    ...shuffle(fresh, rng).slice(0, MAX_NEW_CARDS_PER_SESSION),
  ];
}
