/**
 * Markdown → mind map tree.
 *
 * The map is written the way people (and LLMs) already outline a topic:
 *   # Central topic
 *   ## Branch
 *   ### Sub-branch
 *   - detail
 *     - nested detail
 *
 * Headings nest by level, list items nest by indentation under the nearest heading,
 * and a loose paragraph becomes a leaf of the heading above it. Code blocks, tables,
 * rules and front matter are skipped. Node ids are tree paths ("0.2.1"), so they stay
 * stable while the text is edited and collapse state survives a live preview.
 */

export interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
}

export const MAX_MIND_MAP_NODES = 1000;
export const MAX_NODE_TEXT = 300;
const DEFAULT_TITLE = 'Mind map';

interface Draft {
  text: string;
  children: Draft[];
}

type Frame =
  | { kind: 'root'; draft: Draft }
  | { kind: 'heading'; level: number; draft: Draft }
  | { kind: 'item'; indent: number; draft: Draft };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const LIST_ITEM = /^(\s*)(?:[-*+]|\d{1,9}[.)])\s+(.*)$/;
const RULE = /^\s{0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/;
const FENCE = /^\s{0,3}(```|~~~)/;
const TABLE_ROW = /^\s*\|/;
const FRONT_MATTER = /^---\n[\s\S]*?\n---(?:\n|$)/;

function indentWidth(raw: string): number {
  let width = 0;
  for (const char of raw) width += char === '\t' ? 4 : 1;
  return width;
}

/** Inline Markdown → plain text: emphasis, code, links, images, HTML and escapes. */
export function stripInlineMarkdown(input: string): string {
  return input
    .replace(/<[^>]+>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1$2')
    .replace(/(^|[^\w])_(?!\s)([^_]+?)_(?!\w)/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/^\[[ xX]\]\s+/, '')
    .replace(/\\([\\`*_{}[\]()#+\-.!|~>])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NODE_TEXT);
}

function toNode(draft: Draft, id: string): MindMapNode {
  return {
    id,
    text: draft.text,
    children: draft.children.map((child, index) => toNode(child, `${id}.${index}`)),
  };
}

export function parseMindMapMarkdown(markdown: string, fallbackTitle?: string): MindMapNode {
  const source = markdown.replace(/\r\n?/g, '\n').replace(FRONT_MATTER, '');
  const top: Draft = { text: '', children: [] };
  const stack: Frame[] = [{ kind: 'root', draft: top }];
  let inFence = false;
  // The draft a following unmarked line continues (lazy list/paragraph continuation).
  let open: Draft | null = null;

  const current = (): Frame => stack[stack.length - 1];
  const popItems = (): void => {
    while (current().kind === 'item') stack.pop();
  };
  const add = (parent: Draft, text: string): Draft | null => {
    if (!text) return null;
    const draft: Draft = { text, children: [] };
    parent.children.push(draft);
    return draft;
  };

  for (const line of source.split('\n')) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      open = null;
      continue;
    }
    if (inFence) continue;

    if (line.trim() === '') {
      open = null;
      continue;
    }
    if (RULE.test(line) || TABLE_ROW.test(line)) {
      open = null;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      while (true) {
        const frame = current();
        if (frame.kind === 'root') break;
        if (frame.kind === 'heading' && frame.level < level) break;
        stack.pop();
      }
      const draft = add(current().draft, stripInlineMarkdown(heading[2]));
      if (draft) stack.push({ kind: 'heading', level, draft });
      open = null;
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const indent = indentWidth(item[1]);
      while (true) {
        const frame = current();
        if (frame.kind !== 'item' || frame.indent < indent) break;
        stack.pop();
      }
      const draft = add(current().draft, stripInlineMarkdown(item[2].replace(/^>\s?/, '')));
      if (draft) stack.push({ kind: 'item', indent, draft });
      open = draft;
      continue;
    }

    const text = stripInlineMarkdown(line.replace(/^\s*>\s?/, ''));
    if (!text) continue;
    if (open) {
      open.text = `${open.text} ${text}`.slice(0, MAX_NODE_TEXT);
      continue;
    }
    popItems();
    open = add(current().draft, text);
  }

  // A single top-level entry ("# Topic") is the centre; otherwise the title is.
  if (top.children.length === 1) return toNode(top.children[0], '0');
  top.text = stripInlineMarkdown(fallbackTitle ?? '') || DEFAULT_TITLE;
  return toNode(top, '0');
}

export function countMindMapNodes(node: MindMapNode): number {
  return node.children.reduce((total, child) => total + countMindMapNodes(child), 1);
}

export function maxMindMapDepth(node: MindMapNode): number {
  return node.children.reduce((deepest, child) => Math.max(deepest, 1 + maxMindMapDepth(child)), 0);
}
