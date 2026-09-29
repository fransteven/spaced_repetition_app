import type { ReaderPreferences } from '@/lib/services/reader-preferences-service';

/**
 * reader-theme.ts — builds the stylesheet injected into epub.js iframes.
 *
 * Tailwind classes cannot reach the iframe, so the resolved design tokens are
 * read from <html> (which carries data-reader-theme) and serialised into CSS.
 * No hex values live here: every colour comes from globals.css.
 */

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

// Iowan Old Style is Apple's Books face (system font on macOS/iOS, not
// redistributable); Literata is the self-hosted OFL fallback everywhere else.
const FONT_STACKS: Record<Exclude<ReaderPreferences['font_family'], 'original'>, string> = {
  book: '"Iowan Old Style", "Charter", "Literata", Georgia, serif',
  sans: 'Inter, -apple-system, system-ui, "Segoe UI", sans-serif',
};

export interface ReaderTokens {
  background: string;
  foreground: string;
  link: string;
  selection: string;
  highlight: Record<HighlightColor, string>;
  highlightOpacity: string;
}

export function readReaderTokens(): ReaderTokens {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string): string => style.getPropertyValue(name).trim();
  return {
    background: token('--background'),
    foreground: token('--on-surface'),
    link: token('--primary'),
    selection: token('--highlight-blue'),
    highlight: {
      yellow: token('--highlight-yellow'),
      green: token('--highlight-green'),
      blue: token('--highlight-blue'),
      pink: token('--highlight-pink'),
    },
    highlightOpacity: token('--highlight-opacity') || '0.5',
  };
}

function literataFaces(origin: string): string {
  const face = (weight: number, style: 'normal' | 'italic'): string =>
    `@font-face{font-family:"Literata";font-style:${style};font-weight:${weight};font-display:swap;` +
    `src:url("${origin}/fonts/literata/literata-latin-${weight}-${style}.woff2") format("woff2");}`;
  return [face(400, 'normal'), face(400, 'italic'), face(600, 'normal'), face(600, 'italic')].join('');
}

export function buildReaderCss(tokens: ReaderTokens, prefs: ReaderPreferences, origin: string): string {
  const fontRule =
    prefs.font_family === 'original'
      ? ''
      : `body, body p, body div, body span, body li, body blockquote, body h1, body h2, body h3, body h4, body h5, body h6 {
           font-family: ${FONT_STACKS[prefs.font_family]} !important;
         }`;

  return `
${literataFaces(origin)}
html {
  font-size: ${Math.round(125 * prefs.font_scale)}% !important;
  background: ${tokens.background} !important;
  -webkit-text-size-adjust: 100%;
}
body {
  font-size: 1rem !important;
  color: ${tokens.foreground} !important;
  background: transparent !important;
  line-height: ${prefs.line_height} !important;
  text-rendering: optimizeLegibility;
  font-variant-ligatures: common-ligatures;
  -webkit-font-smoothing: antialiased;
}
${fontRule}
body * { color: inherit !important; background-color: transparent !important; }
body p, body li, body blockquote, body dd {
  line-height: ${prefs.line_height} !important;
  text-align: ${prefs.justify ? 'justify' : 'start'} !important;
  hyphens: auto !important;
  -webkit-hyphens: auto !important;
  orphans: 2;
  widows: 2;
}
body a, body a * { color: ${tokens.link} !important; }
img, svg, video { max-width: 100% !important; height: auto; }
::selection { background: ${tokens.selection}; }
`;
}

/** SVG attributes epub.js applies to each highlight (blend lives in globals.css). */
export function highlightStyles(tokens: ReaderTokens, color: HighlightColor): Record<string, string> {
  return {
    fill: tokens.highlight[color],
    'fill-opacity': tokens.highlightOpacity,
  };
}
