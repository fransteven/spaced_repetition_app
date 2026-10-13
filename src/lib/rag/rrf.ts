/** Rank constant of Reciprocal Rank Fusion (Cormack et al., 2009); 60 is the usual default. */
export const RRF_K = 60;

/**
 * Reciprocal Rank Fusion: merges ranked lists (e.g. vector and full-text results) by summing
 * 1 / (k + rank) per item. Items found by several lists rise; scores need no normalisation.
 * The first occurrence of an item (by list order) is the one returned.
 */
export function fuseRrf<T extends { id: string }>(lists: T[][], limit: number, k: number = RRF_K): T[] {
  const scores = new Map<string, { item: T; score: number; order: number }>();
  let order = 0;
  for (const list of lists) {
    list.forEach((item, rank) => {
      const entry = scores.get(item.id);
      if (entry) entry.score += 1 / (k + rank + 1);
      else scores.set(item.id, { item, score: 1 / (k + rank + 1), order: order++ });
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.item);
}
