/**
 * sanitize-section.ts — makes a book section inert before epub.js puts it in its iframe.
 *
 * The iframe needs `allow-scripts`: WebKit (every iPhone/iPad browser and Safari) dispatches no
 * events — taps, selections, touches — to the page's listeners inside a sandboxed frame without
 * it, so on those browsers nothing in the book could be selected or highlighted. With
 * `allow-same-origin`, a script from the book would run as this app, so no book code may ever
 * run: script-capable elements, inline handlers and script URLs are removed, and a CSP
 * (`script-src 'none'`) placed first in <head> blocks anything that slips through.
 */

const CSP = "script-src 'none'; object-src 'none'; frame-src 'none'; child-src 'none'; base-uri 'none'; form-action 'none'";
const BLOCKED = 'script, iframe, frame, frameset, object, embed, applet, portal, base, meta[http-equiv]';
const URL_ATTRIBUTES = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'data', 'srcdoc', 'poster', 'background']);

function isScriptUrl(value: string): boolean {
  // Browsers ignore whitespace and control characters inside the scheme.
  const compact = value.replace(/[\u0000- \u007f]+/g, '').toLowerCase();
  return compact.startsWith('javascript:') || compact.startsWith('vbscript:') || compact.startsWith('data:text/html');
}

function clean(doc: Document): void {
  doc.querySelectorAll(BLOCKED).forEach((element) => element.remove());
  doc.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || (URL_ATTRIBUTES.has(name) && isScriptUrl(attribute.value))) {
        element.removeAttributeNode(attribute);
      }
    }
  });
  const root = doc.documentElement;
  let head: Element | null = doc.querySelector('head');
  if (!head) {
    head = doc.createElementNS(root.namespaceURI, 'head');
    root.insertBefore(head, root.firstChild);
  }
  const meta = doc.createElementNS(root.namespaceURI, 'meta');
  meta.setAttribute('http-equiv', 'Content-Security-Policy');
  meta.setAttribute('content', CSP);
  head.insertBefore(meta, head.firstChild);
}

/** Returns the section markup with everything that could run removed. */
export function sanitizeSection(markup: string): string {
  const xhtml = new DOMParser().parseFromString(markup, 'application/xhtml+xml');
  if (!xhtml.querySelector('parsererror')) {
    clean(xhtml);
    return new XMLSerializer().serializeToString(xhtml);
  }
  // Not well-formed XHTML: epub.js hands it to the iframe as HTML anyway.
  const html = new DOMParser().parseFromString(markup, 'text/html');
  clean(html);
  return `<!DOCTYPE html>${html.documentElement.outerHTML}`;
}
