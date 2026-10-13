import { describe, expect, it } from 'vitest';
import { fuseRrf } from './rrf';

const ids = (items: Array<{ id: string }>): string[] => items.map((item) => item.id);

describe('fuseRrf', () => {
  it('ranks items found by both lists first', () => {
    const vector = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const lexical = [{ id: 'c' }, { id: 'd' }];
    expect(ids(fuseRrf([vector, lexical], 10))).toEqual(['c', 'a', 'b', 'd']);
  });

  it('keeps the first list order on ties and applies the limit', () => {
    expect(ids(fuseRrf([[{ id: 'a' }], [{ id: 'b' }]], 1))).toEqual(['a']);
  });

  it('returns the first occurrence of a duplicated item', () => {
    const [first] = fuseRrf([[{ id: 'a', from: 'vector' }], [{ id: 'a', from: 'lexical' }]], 5);
    expect(first).toEqual({ id: 'a', from: 'vector' });
  });

  it('handles empty input', () => {
    expect(fuseRrf([[], []], 5)).toEqual([]);
  });
});
