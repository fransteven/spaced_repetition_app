/**
 * Isolation for LLM-written HTML. The document is served with a CSP `sandbox` directive and shown in an
 * <iframe sandbox="allow-scripts">: its origin is opaque, so its scripts run but cannot read the app's
 * cookies or storage, reach the parent DOM, or call /api/* with the user's session. NEVER add
 * allow-same-origin, allow-top-navigation*, allow-popups or allow-forms. See docs/plans/canvas-html.md §2.
 */
export const CANVAS_IFRAME_SANDBOX = 'allow-scripts';

/** CDNs a canvas may load scripts from (LLMs reach for these). */
export const CANVAS_SCRIPT_HOSTS = [
  'https://cdnjs.cloudflare.com',
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
  'https://cdn.tailwindcss.com',
  'https://esm.sh',
] as const;

const STYLE_HOSTS = ['https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net', 'https://unpkg.com'];
const FONT_HOSTS = ['https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'];

export function canvasContentSecurityPolicy(): string {
  return [
    `sandbox ${CANVAS_IFRAME_SANDBOX}`,
    "default-src 'none'",
    // Inline code and eval are safe only because the origin is opaque: there is nothing to steal.
    `script-src 'unsafe-inline' 'unsafe-eval' ${CANVAS_SCRIPT_HOSTS.join(' ')}`,
    `style-src 'unsafe-inline' ${STYLE_HOSTS.join(' ')}`,
    `font-src data: ${FONT_HOSTS.join(' ')}`,
    'img-src data: blob: https:',
    'media-src data: blob:',
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "frame-src 'none'",
    "frame-ancestors 'self'",
  ].join('; ');
}

export function canvasResponseHeaders(byteLength: number): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': String(byteLength),
    'Content-Security-Policy': canvasContentSecurityPolicy(),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'private, no-store',
  };
}
