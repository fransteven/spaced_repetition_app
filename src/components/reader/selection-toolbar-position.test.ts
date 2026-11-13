import { describe, expect, it } from 'vitest';

import {
  NATIVE_MENU,
  TOOLBAR_EDGE,
  TOOLBAR_GAP,
  TOUCH_HANDLE,
  selectionToolbarPosition,
} from '@/components/reader/selection-toolbar-position';

const viewport = { width: 400, height: 850 };
const size = { width: 300, height: 52 };

function rect(top: number, bottom: number): { top: number; bottom: number; left: number; width: number } {
  return { top, bottom, left: 40, width: 320 };
}

/** The band the OS selection menu occupies when it sits above the selection. */
function nativeMenuAbove(top: number): [number, number] {
  return [top - TOUCH_HANDLE - NATIVE_MENU, top];
}

function overlaps(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

describe('selectionToolbarPosition', () => {
  it('goes above the selection with a mouse', () => {
    const position = selectionToolbarPosition(rect(400, 440), size, viewport, false);
    expect(position.top).toBe(400 - size.height - TOOLBAR_GAP);
  });

  it('goes below a selection at the very top with a mouse', () => {
    const position = selectionToolbarPosition(rect(20, 60), size, viewport, false);
    expect(position.top).toBe(60 + TOOLBAR_GAP);
  });

  it('goes below the selection and its handles on touch, away from the native menu', () => {
    const position = selectionToolbarPosition(rect(200, 330), size, viewport, true);
    expect(position.top).toBe(330 + TOUCH_HANDLE + TOOLBAR_GAP);
    expect(overlaps([position.top, position.top + size.height], nativeMenuAbove(200))).toBe(false);
    expect(overlaps([position.top, position.top + size.height], [200, 330 + TOUCH_HANDLE])).toBe(false);
  });

  it('leaves room for the native menu when it drops below a selection near the top', () => {
    const position = selectionToolbarPosition(rect(40, 80), size, viewport, true);
    expect(position.top).toBe(80 + TOUCH_HANDLE + NATIVE_MENU + TOOLBAR_GAP);
  });

  it('goes above, clear of the native menu, when there is no room below', () => {
    const position = selectionToolbarPosition(rect(700, 800), size, viewport, true);
    expect(position.top).toBe(700 - TOUCH_HANDLE - NATIVE_MENU - TOOLBAR_GAP - size.height);
    expect(overlaps([position.top, position.top + size.height], nativeMenuAbove(700))).toBe(false);
  });

  it('keeps to the bottom edge for a selection taller than the screen', () => {
    const position = selectionToolbarPosition(rect(30, 840), size, viewport, true);
    expect(position.top).toBe(viewport.height - size.height - TOOLBAR_EDGE);
  });

  it('stays inside the viewport horizontally', () => {
    const position = selectionToolbarPosition({ top: 300, bottom: 320, left: 380, width: 15 }, size, viewport, true);
    expect(position.left).toBe(viewport.width - size.width - TOOLBAR_EDGE);
  });
});
