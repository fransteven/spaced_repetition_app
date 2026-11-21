import { describe, expect, it } from 'vitest';

import { CANVAS_IFRAME_SANDBOX, canvasContentSecurityPolicy, canvasResponseHeaders } from './csp';

const directives = (): Map<string, string> =>
  new Map(
    canvasContentSecurityPolicy()
      .split(';')
      .map((part) => part.trim())
      .map((part) => [part.split(' ')[0], part.slice(part.indexOf(' ') + 1)] as [string, string]),
  );

describe('canvas isolation', () => {
  it('never grants the canvas the app origin or a way out of its frame', () => {
    for (const sandbox of [CANVAS_IFRAME_SANDBOX, directives().get('sandbox') ?? '']) {
      expect(sandbox).toBe('allow-scripts');
      expect(sandbox).not.toMatch(/same-origin|top-navigation|popups|forms|modals/);
    }
  });

  it('blocks network calls, form posts, base rewrites and nested frames', () => {
    const csp = directives();
    expect(csp.get('default-src')).toBe("'none'");
    expect(csp.get('connect-src')).toBe("'none'");
    expect(csp.get('form-action')).toBe("'none'");
    expect(csp.get('base-uri')).toBe("'none'");
    expect(csp.get('frame-src')).toBe("'none'");
    expect(csp.get('frame-ancestors')).toBe("'self'");
  });

  it('only loads scripts inline or from the CDN allowlist', () => {
    const sources = (directives().get('script-src') ?? '').split(' ');
    for (const source of sources) {
      expect(source.startsWith("'") || source.startsWith('https://')).toBe(true);
    }
    expect(sources).not.toContain('https:');
    expect(sources).not.toContain('*');
  });

  it('serves the HTML uncached, unsniffed and with the CSP', () => {
    const headers = canvasResponseHeaders(42);
    expect(headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(headers['Content-Length']).toBe('42');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Cache-Control']).toContain('no-store');
    expect(headers['Content-Security-Policy']).toMatch(/^sandbox allow-scripts;/);
  });
});
