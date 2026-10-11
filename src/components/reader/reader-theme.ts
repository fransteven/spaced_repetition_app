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

// Code keeps a fixed-width face whatever the reading font is.
const MONO_STACK = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export interface ReaderTokens {
  background: string;
  foreground: string;
  link: string;
  selection: string;
  highlight: Record<HighlightColor, string>;
  highlightOpacity: string;
  /** Resolved theme is dark (explicit Dark, or Auto while the app is dark). */
  dark: boolean;
}

export function readReaderTokens(): ReaderTokens {
  const root = document.documentElement;
  const style = getComputedStyle(root);
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
    dark: root.dataset.readerTheme
      ? root.dataset.readerTheme === 'dark'
      : root.classList.contains('dark'),
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
         }
         body pre, body pre *, body code, body code *, body kbd, body samp, body tt {
           font-family: ${MONO_STACK} !important;
         }`;

  return `
${literataFaces(origin)}
html {
  font-size: ${Math.round(112.5 * prefs.font_scale)}% !important;
  /* epub.js pads the page 20 px top and bottom (inline, not !important): give that room to the text. */
  padding-top: 8px !important;
  padding-bottom: 8px !important;
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
${tokens.dark ? darkColorRules(tokens) : ''}
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

/**
 * Light and Sepia keep the publisher's colours (syntax-highlighted code,
 * coloured headings, callout boxes), like Kindle and Apple Books do: they were
 * designed for a light page. On a dark page those colours would be unreadable,
 * so prose is flattened to the theme foreground, and code blocks keep their
 * colours through invert + hue-rotate: lightness flips, hues survive. The block
 * is first painted with the inverse of the final palette (foreground as surface,
 * background as text) so it lands as a dim surface with light text.
 */
function darkColorRules(tokens: ReaderTokens): string {
  return `
body *:not(pre):not(pre *) { color: inherit !important; background-color: transparent !important; }
body pre {
  color: ${tokens.background} !important;
  background-color: ${tokens.foreground} !important;
  filter: invert(1) hue-rotate(180deg);
  padding: 0.75em;
  border-radius: 6px;
}
body pre * { background-color: transparent !important; }
`;
}

/** SVG attributes epub.js applies to each highlight (blend lives in globals.css). */
export function highlightStyles(tokens: ReaderTokens, color: HighlightColor): Record<string, string> {
  return {
    fill: tokens.highlight[color],
    'fill-opacity': tokens.highlightOpacity,
  };
}
