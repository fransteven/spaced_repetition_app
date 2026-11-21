import { describe, expect, it } from 'vitest';

import { STORAGE_SHIM, extractCanvasTitle, prepareCanvasHtml } from './prepare-html';

const count = (text: string, part: string): number => text.split(part).length - 1;

describe('prepareCanvasHtml', () => {
  it('puts the storage shim first in an existing <head>', () => {
    const html = '<!DOCTYPE html><html lang="en"><head data-x="1"><title>T</title><script>a()</script></head><body></body></html>';
    const out = prepareCanvasHtml(html);
    expect(out.startsWith('<!DOCTYPE html><html lang="en"><head data-x="1">' + STORAGE_SHIM + '<title>')).toBe(true);
    expect(count(out, 'data-neurocards-shim')).toBe(1);
  });

  it('adds a <head> when the document has none', () => {
    const out = prepareCanvasHtml('<html><body><p>Hi</p></body></html>');
    expect(out).toBe(`<html><head>${STORAGE_SHIM}</head><body><p>Hi</p></body></html>`);
  });

  it('wraps fragments in a mobile-ready document', () => {
    const out = prepareCanvasHtml('<!doctype html>\n<div id="app"></div><script>run()</script>');
    expect(out.startsWith('<!doctype html><html><head><meta charset="utf-8">')).toBe(true);
    expect(out).toContain('name="viewport"');
    expect(out).toContain(`${STORAGE_SHIM}</head><body>\n<div id="app"></div><script>run()</script></body></html>`);
    expect(count(out.toLowerCase(), '<!doctype')).toBe(1);
  });

  it('does not mistake <header> for <head>', () => {
    const out = prepareCanvasHtml('<html><body><header>x</header></body></html>');
    expect(out.startsWith(`<html><head>${STORAGE_SHIM}</head>`)).toBe(true);
  });
});

describe('extractCanvasTitle', () => {
  it('reads and decodes the <title>', () => {
    expect(extractCanvasTitle('<html><head><title>  Entropy &amp;\n Order </title></head></html>')).toBe('Entropy & Order');
  });

  it('returns null without a usable title', () => {
    expect(extractCanvasTitle('<div>no title</div>')).toBeNull();
    expect(extractCanvasTitle('<title>   </title>')).toBeNull();
  });

  it('caps long titles at 120 characters', () => {
    expect(extractCanvasTitle(`<title>${'a'.repeat(300)}</title>`)?.length).toBe(120);
  });
});
