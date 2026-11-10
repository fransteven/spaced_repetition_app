import type { MindMapNode } from '@/lib/mind-maps/parse-markdown';

/**
 * Two-sided mind map layout. The centre sits at (0, 0); first-level branches are split
 * between the right and left side by the height of their subtrees, each subtree is
 * stacked vertically and centred on its parent. Pure: node sizes are measured by the
 * caller (real fonts, real wrapping) and passed in.
 */

export interface NodeSize {
  width: number;
  height: number;
}

export type MindMapSide = 'center' | 'right' | 'left';

export interface PositionedNode {
  node: MindMapNode;
  depth: number;
  side: MindMapSide;
  /** Top-left corner in map coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
}

export interface MindMapEdge {
  id: string;
  depth: number;
  path: string;
}

export interface MindMapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface MindMapLayout {
  nodes: PositionedNode[];
  edges: MindMapEdge[];
  bounds: MindMapBounds;
}

const H_GAP = 56;
const V_GAP_BRANCH = 20;
const V_GAP_LEAF = 10;
const FALLBACK: NodeSize = { width: 120, height: 36 };

function gapFor(depth: number): number {
  return depth <= 1 ? V_GAP_BRANCH : V_GAP_LEAF;
}

/** Horizontal S-curve between two edge midpoints. */
function curve(x1: number, y1: number, x2: number, y2: number): string {
  const mid = x1 + (x2 - x1) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

export function layoutMindMap(
  root: MindMapNode,
  sizeOf: (node: MindMapNode, depth: number) => NodeSize | undefined,
  collapsed: ReadonlySet<string>,
): MindMapLayout {
  const size = (node: MindMapNode, depth: number): NodeSize => sizeOf(node, depth) ?? FALLBACK;
  const isOpen = (node: MindMapNode): boolean => node.children.length > 0 && !collapsed.has(node.id);

  const heights = new Map<string, number>();
  const subtreeHeight = (node: MindMapNode, depth: number): number => {
    const own = size(node, depth).height;
    if (!isOpen(node)) {
      heights.set(node.id, own);
      return own;
    }
    const childDepth = depth + 1;
    const stacked =
      node.children.reduce((sum, child) => sum + subtreeHeight(child, childDepth), 0) +
      gapFor(childDepth) * (node.children.length - 1);
    const total = Math.max(own, stacked);
    heights.set(node.id, total);
    return total;
  };
  subtreeHeight(root, 0);

  const nodes: PositionedNode[] = [];
  const edges: MindMapEdge[] = [];
  const bounds: MindMapBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  const record = (entry: PositionedNode): void => {
    nodes.push(entry);
    bounds.minX = Math.min(bounds.minX, entry.x);
    bounds.minY = Math.min(bounds.minY, entry.y);
    bounds.maxX = Math.max(bounds.maxX, entry.x + entry.width);
    bounds.maxY = Math.max(bounds.maxY, entry.y + entry.height);
  };

  const placeChildren = (
    children: MindMapNode[],
    side: 'right' | 'left',
    depth: number,
    anchorX: number,
    anchorY: number,
  ): void => {
    const gap = gapFor(depth);
    const total = children.reduce((sum, child) => sum + (heights.get(child.id) ?? 0), 0) + gap * (children.length - 1);
    let top = anchorY - total / 2;
    for (const child of children) {
      const block = heights.get(child.id) ?? 0;
      const centerY = top + block / 2;
      const { width, height } = size(child, depth);
      const x = side === 'right' ? anchorX + H_GAP : anchorX - H_GAP - width;
      const nearEdge = side === 'right' ? x : x + width;
      edges.push({ id: child.id, depth, path: curve(anchorX, anchorY, nearEdge, centerY) });
      place(child, side, depth, x, centerY - height / 2, width, height);
      top += block + gap;
    }
  };

  const place = (
    node: MindMapNode,
    side: 'right' | 'left',
    depth: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void => {
    const open = isOpen(node);
    record({ node, depth, side, x, y, width, height, collapsed: node.children.length > 0 && !open });
    if (!open) return;
    const farEdge = side === 'right' ? x + width : x;
    placeChildren(node.children, side, depth + 1, farEdge, y + height / 2);
  };

  const rootSize = size(root, 0);
  const rootX = -rootSize.width / 2;
  const rootY = -rootSize.height / 2;
  const rootOpen = isOpen(root);
  record({
    node: root,
    depth: 0,
    side: 'center',
    x: rootX,
    y: rootY,
    width: rootSize.width,
    height: rootSize.height,
    collapsed: root.children.length > 0 && !rootOpen,
  });

  if (rootOpen) {
    const { right, left } = splitBranches(root.children, (child) => heights.get(child.id) ?? 0);
    placeChildren(right, 'right', 1, rootX + rootSize.width, 0);
    if (left.length > 0) placeChildren(left, 'left', 1, rootX, 0);
  }

  return { nodes, edges, bounds };
}

/**
 * Keeps the reading order (right side top → bottom, then left side top → bottom) and
 * moves the split point to where both sides are closest in height. Up to three
 * branches all go right: a tiny map reads better as a single fan.
 */
export function splitBranches<T>(children: T[], weight: (child: T) => number): { right: T[]; left: T[] } {
  if (children.length <= 3) return { right: children, left: [] };
  const total = children.reduce((sum, child) => sum + weight(child), 0);
  let best = 1;
  let bestDiff = Number.POSITIVE_INFINITY;
  let running = 0;
  for (let index = 0; index < children.length - 1; index += 1) {
    running += weight(children[index]);
    const diff = Math.abs(total - 2 * running);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = index + 1;
    }
  }
  return { right: children.slice(0, best), left: children.slice(best) };
}

/** Scale + offset that fits the bounds in a viewport, never zooming past `maxScale`. */
export function fitToViewport(
  bounds: MindMapBounds,
  viewport: { width: number; height: number },
  padding = 32,
  maxScale = 1.1,
): { x: number; y: number; scale: number } {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.max(
    0.1,
    Math.min(maxScale, (viewport.width - padding * 2) / width, (viewport.height - padding * 2) / height),
  );
  const centerX = bounds.minX + width / 2;
  const centerY = bounds.minY + height / 2;
  return { x: viewport.width / 2 - centerX * scale, y: viewport.height / 2 - centerY * scale, scale };
}
