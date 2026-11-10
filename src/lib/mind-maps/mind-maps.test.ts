import { describe, expect, it } from 'vitest';

import { countMindMapNodes, parseMindMapMarkdown, stripInlineMarkdown } from './parse-markdown';
import { fitToViewport, layoutMindMap, splitBranches } from './layout';
import type { MindMapNode } from './parse-markdown';

function shape(node: MindMapNode): unknown {
  return node.children.length === 0 ? node.text : { [node.text]: node.children.map(shape) };
}

describe('parseMindMapMarkdown', () => {
  it('uses a single top heading as the centre and nests headings and lists', () => {
    const tree = parseMindMapMarkdown(`# Photosynthesis
## Inputs
- Light
- Water
  - from roots
## Outputs
### Glucose
### Oxygen
`);
    expect(shape(tree)).toEqual({
      Photosynthesis: [
        { Inputs: ['Light', { Water: ['from roots'] }] },
        { Outputs: ['Glucose', 'Oxygen'] },
      ],
    });
    expect(countMindMapNodes(tree)).toBe(8);
  });

  it('falls back to the title when there are several top-level entries', () => {
    const tree = parseMindMapMarkdown('## A\n## B\n- b1', 'My topic');
    expect(shape(tree)).toEqual({ 'My topic': ['A', { B: ['b1'] }] });
  });

  it('gives stable path ids', () => {
    const tree = parseMindMapMarkdown('# Root\n- a\n  - a1\n- b');
    expect(tree.id).toBe('0');
    expect(tree.children.map((child) => child.id)).toEqual(['0.0', '0.1']);
    expect(tree.children[0].children[0].id).toBe('0.0.0');
  });

  it('skips code fences, tables, rules and front matter; keeps paragraphs as leaves', () => {
    const tree = parseMindMapMarkdown(`---
title: x
---
# Root
Intro sentence
continues here.

\`\`\`js
- not a node
\`\`\`
| a | b |
---
* starred
1. numbered
`);
    expect(shape(tree)).toEqual({ Root: ['Intro sentence continues here.', 'starred', 'numbered'] });
  });

  it('dedents list items back to the right parent and handles tabs', () => {
    const tree = parseMindMapMarkdown('# R\n- a\n\t- a1\n\t\t- a1x\n\t- a2\n- b');
    expect(shape(tree)).toEqual({ R: [{ a: [{ a1: ['a1x'] }, 'a2'] }, 'b'] });
  });

  it('closes deeper headings when a shallower one starts', () => {
    const tree = parseMindMapMarkdown('# R\n## A\n### A1\n- x\n## B');
    expect(shape(tree)).toEqual({ R: [{ A: [{ A1: ['x'] }] }, 'B'] });
  });

  it('returns a default centre for empty input', () => {
    expect(parseMindMapMarkdown('   ').text).toBe('Mind map');
  });
});

describe('stripInlineMarkdown', () => {
  it('removes inline syntax but keeps words', () => {
    expect(stripInlineMarkdown('**Bold** and *it* `code` [link](http://x) ![img](a.png) ~~gone~~')).toBe(
      'Bold and it code link img gone',
    );
    expect(stripInlineMarkdown('[x] done task')).toBe('done task');
    expect(stripInlineMarkdown('snake_case_name stays')).toBe('snake_case_name stays');
    expect(stripInlineMarkdown('2 * 3 * 4')).toBe('2 * 3 * 4');
  });
});

describe('layoutMindMap', () => {
  const tree = parseMindMapMarkdown('# R\n## A\n- a1\n- a2\n## B\n## C\n## D');
  const sizes = (): { width: number; height: number } => ({ width: 100, height: 40 });

  it('centres the root and puts branches on both sides', () => {
    const layout = layoutMindMap(tree, sizes, new Set());
    const root = layout.nodes.find((entry) => entry.depth === 0);
    expect(root).toMatchObject({ x: -50, y: -20, side: 'center' });
    const sides = new Set(layout.nodes.filter((entry) => entry.depth === 1).map((entry) => entry.side));
    expect(sides).toEqual(new Set(['right', 'left']));
    expect(layout.edges).toHaveLength(layout.nodes.length - 1);
  });

  it('never overlaps siblings', () => {
    const layout = layoutMindMap(tree, sizes, new Set());
    const right = layout.nodes.filter((entry) => entry.side === 'right' && entry.depth === 2).sort((a, b) => a.y - b.y);
    for (let index = 1; index < right.length; index += 1) {
      expect(right[index].y).toBeGreaterThanOrEqual(right[index - 1].y + right[index - 1].height);
    }
  });

  it('hides the children of a collapsed node and marks it', () => {
    const layout = layoutMindMap(tree, sizes, new Set(['0.0']));
    expect(layout.nodes.map((entry) => entry.node.id)).not.toContain('0.0.0');
    expect(layout.nodes.find((entry) => entry.node.id === '0.0')?.collapsed).toBe(true);
  });
});

describe('splitBranches', () => {
  it('keeps small maps on one side', () => {
    expect(splitBranches([1, 2, 3], (n) => n)).toEqual({ right: [1, 2, 3], left: [] });
  });

  it('balances by weight in reading order', () => {
    expect(splitBranches([5, 1, 1, 1, 2], (n) => n)).toEqual({ right: [5], left: [1, 1, 1, 2] });
  });
});

describe('fitToViewport', () => {
  it('centres the bounds and caps the zoom', () => {
    const fit = fitToViewport({ minX: -50, minY: -20, maxX: 50, maxY: 20 }, { width: 1000, height: 600 });
    expect(fit.scale).toBe(1.1);
    expect(fit.x).toBe(500);
    expect(fit.y).toBe(300);
  });
});
