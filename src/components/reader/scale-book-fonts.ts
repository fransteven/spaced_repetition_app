/**
 * scale-book-fonts.ts — makes a book's absolute font sizes follow the reader's Text size.
 *
 * Text size only changes the root size (`html { font-size: N% }`, see reader-theme.ts), which reaches
 * text that inherits from body or is sized in em/rem/%. Many publisher EPUBs (Packt, InDesign exports)
 * size every class in pt or px instead (`p.normal { font-size: 11pt; line-height: 13.2pt }`), so their
 * text never grew. Each section's absolute font sizes and line heights are rewritten to rem once it
 * loads: the book keeps its proportions (headings larger, code smaller) and follows the root.
 */

const PX_PER_REM = 16;
const PX_PER_PT = 4 / 3;
const PROPERTIES = ['font-size', 'line-height'] as const;

// Absolute-size keywords resolve against a fixed 16 px "medium", not the root (CSS Fonts 4 §2.5).
const KEYWORD_PX: Record<string, number> = {
  'xx-small': 9,
  'x-small': 10,
  small: 13,
  medium: 16,
  large: 18,
  'x-large': 24,
  'xx-large': 32,
  'xxx-large': 48,
};

function rem(px: number): string {
  return `${Math.round((px / PX_PER_REM) * 10000) / 10000}rem`;
}

/** The rem equivalent of an absolute CSS size (pt, px, absolute keyword), or null to leave the value as is. */
export function toRelativeSize(value: string): string | null {
  const text = value.trim().toLowerCase();
  const keyword = KEYWORD_PX[text];
  if (keyword !== undefined) return rem(keyword);
  const match = /^(\d*\.?\d+)(pt|px)$/.exec(text);
  if (!match) return null;
  const amount = Number(match[1]);
  if (amount === 0) return null;
  return rem(match[2] === 'pt' ? amount * PX_PER_PT : amount);
}

function rewrite(style: CSSStyleDeclaration): void {
  for (const property of PROPERTIES) {
    const relative = toRelativeSize(style.getPropertyValue(property));
    if (relative) style.setProperty(property, relative, style.getPropertyPriority(property));
  }
}

function rewriteRules(rules: CSSRuleList, view: Window & typeof globalThis): void {
  for (const rule of Array.from(rules)) {
    if (rule instanceof view.CSSStyleRule) {
      rewrite(rule.style);
      // CSS nesting: a style rule may hold nested rules.
      if (rule.cssRules) rewriteRules(rule.cssRules, view);
    } else if (rule instanceof view.CSSGroupingRule) {
      rewriteRules(rule.cssRules, view); // @media, @supports, @layer blocks
    }
  }
}

/** Rewrites the absolute font sizes of a loaded section to rem. Idempotent: rem values are left alone. */
export function scaleBookFonts(doc: Document, ownStyleId: string): void {
  const view = doc.defaultView;
  if (!view) return;
  for (const sheet of Array.from(doc.styleSheets)) {
    const owner = sheet.ownerNode;
    if (owner instanceof view.Element && owner.id === ownStyleId) continue;
    try {
      rewriteRules(sheet.cssRules, view);
    } catch (error) {
      console.error('[reader] scale fonts', error); // a sheet whose rules cannot be read
    }
  }
  doc.querySelectorAll('[style]').forEach((element) => {
    if (element instanceof view.HTMLElement || element instanceof view.SVGElement) rewrite(element.style);
  });
}
