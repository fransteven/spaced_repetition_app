import { parse } from 'node-html-parser';

import { MAX_CANVAS_TITLE_LENGTH } from '@/lib/canvases/limits';

/**
 * Web Storage throws a SecurityError in an opaque origin, which breaks canvases that use it.
 * This swaps in an in-memory store (lost on reload) before any of the canvas's own scripts run.
 */
export const STORAGE_SHIM =
  '<script data-neurocards-shim>(function(){function m(){var s=Object.create(null);return{get length(){return Object.keys(s).length},' +
  'key:function(i){var k=Object.keys(s);return i<k.length?k[i]:null},getItem:function(k){k=String(k);return k in s?s[k]:null},' +
  'setItem:function(k,v){s[String(k)]=String(v)},removeItem:function(k){delete s[String(k)]},clear:function(){s=Object.create(null)}}}' +
  "['localStorage','sessionStorage'].forEach(function(n){try{void window[n].length}catch(e){try{Object.defineProperty(window,n,{value:m(),configurable:true})}catch(_){}}})})();</script>";

const HEAD_OPEN = /<head(?:\s[^>]*)?>/i;
const HTML_OPEN = /<html(?:\s[^>]*)?>/i;
const DOCTYPE = /^\s*<!doctype[^>]*>/i;

/** Serves a stored canvas: full documents get the shim first in <head>; fragments are wrapped. */
export function prepareCanvasHtml(html: string): string {
  const head = HEAD_OPEN.exec(html);
  if (head) {
    const end = head.index + head[0].length;
    return html.slice(0, end) + STORAGE_SHIM + html.slice(end);
  }
  const root = HTML_OPEN.exec(html);
  if (root) {
    const end = root.index + root[0].length;
    return `${html.slice(0, end)}<head>${STORAGE_SHIM}</head>${html.slice(end)}`;
  }
  const body = html.replace(DOCTYPE, '');
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `${STORAGE_SHIM}</head><body>${body}</body></html>`
  );
}

/** The document's <title>, entity-decoded and trimmed, or null. */
export function extractCanvasTitle(html: string): string | null {
  const title = parse(html).querySelector('title')?.text.replace(/\s+/g, ' ').trim();
  return title ? title.slice(0, MAX_CANVAS_TITLE_LENGTH) : null;
}
