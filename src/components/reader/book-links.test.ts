import { describe, expect, it } from 'vitest';

import { resolveBookLink } from './book-links';

describe('resolveBookLink', () => {
  it('resolves a sibling section', () => {
    expect(resolveBookLink('ch2.xhtml', 'ch1.xhtml')).toEqual({ kind: 'internal', target: 'ch2.xhtml' });
  });

  it('keeps the fragment', () => {
    expect(resolveBookLink('ch2.xhtml#note-3', 'ch1.xhtml')).toEqual({ kind: 'internal', target: 'ch2.xhtml#note-3' });
  });

  it('resolves a fragment-only link against the current section', () => {
    expect(resolveBookLink('#fn1', 'text/ch1.xhtml')).toEqual({ kind: 'internal', target: 'text/ch1.xhtml#fn1' });
  });

  it('resolves paths relative to the section folder', () => {
    expect(resolveBookLink('../notes/notes.xhtml#n2', 'text/part1/ch1.xhtml')).toEqual({
      kind: 'internal',
      target: 'text/notes/notes.xhtml#n2',
    });
    expect(resolveBookLink('ch2.xhtml', 'text/ch1.xhtml')).toEqual({ kind: 'internal', target: 'text/ch2.xhtml' });
  });

  it('decodes percent-encoded paths', () => {
    expect(resolveBookLink('my%20chapter.xhtml', 'ch1.xhtml')).toEqual({ kind: 'internal', target: 'my chapter.xhtml' });
  });

  it('returns web links as external', () => {
    expect(resolveBookLink('https://example.com/a', 'ch1.xhtml')).toEqual({ kind: 'external', url: 'https://example.com/a' });
  });

  it('ignores empty, mailto and script links', () => {
    expect(resolveBookLink('', 'ch1.xhtml')).toBeNull();
    expect(resolveBookLink('mailto:a@b.c', 'ch1.xhtml')).toBeNull();
    expect(resolveBookLink('javascript:alert(1)', 'ch1.xhtml')).toBeNull();
  });
});
