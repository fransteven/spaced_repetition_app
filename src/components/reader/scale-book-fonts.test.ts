import { describe, expect, it } from 'vitest';

import { toRelativeSize } from './scale-book-fonts';

describe('toRelativeSize', () => {
  it('converts points to rem', () => {
    expect(toRelativeSize('12pt')).toBe('1rem');
    expect(toRelativeSize('11pt')).toBe('0.9167rem');
    expect(toRelativeSize('10.5pt')).toBe('0.875rem');
    expect(toRelativeSize('.75pt')).toBe('0.0625rem');
  });

  it('converts pixels to rem', () => {
    expect(toRelativeSize('16px')).toBe('1rem');
    expect(toRelativeSize('15px')).toBe('0.9375rem');
  });

  it('ignores case and surrounding space', () => {
    expect(toRelativeSize(' 24PX ')).toBe('1.5rem');
  });

  it('converts absolute keywords', () => {
    expect(toRelativeSize('medium')).toBe('1rem');
    expect(toRelativeSize('x-large')).toBe('1.5rem');
    expect(toRelativeSize('small')).toBe('0.8125rem');
  });

  it('leaves relative and computed values alone', () => {
    for (const value of ['1.2em', '0.9rem', '110%', '1.5', 'normal', 'smaller', 'larger', 'inherit', 'calc(10pt + 1em)', 'var(--x)', '2vw', '']) {
      expect(toRelativeSize(value)).toBeNull();
    }
  });

  it('leaves zero alone', () => {
    expect(toRelativeSize('0px')).toBeNull();
  });
});
