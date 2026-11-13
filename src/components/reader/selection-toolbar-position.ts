import type { ViewportRect } from '@/components/reader/use-epub-reader';

/** Space between the toolbar and what it avoids. */
export const TOOLBAR_GAP = 10;
/** Minimum distance from the viewport edges. */
export const TOOLBAR_EDGE = 8;
/**
 * Room for the selection drag handles on touch screens: Android hangs a teardrop (~24 px) under both
 * ends of the selection, iOS puts a knob above the start and below the end.
 */
export const TOUCH_HANDLE = 32;
/**
 * Room for the operating system's own selection menu (Android's "Copy · Select all" bar, iOS's edit
 * menu): ~48 px tall plus its margin. Both sit just above the selection, or just below its handles when
 * there is no room above.
 */
export const NATIVE_MENU = 60;

export interface ToolbarSize {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface ToolbarPosition {
  top: number;
  left: number;
}

function clampLeft(rect: ViewportRect, size: ToolbarSize, viewport: Viewport): number {
  const centered = rect.left + rect.width / 2 - size.width / 2;
  return Math.min(Math.max(centered, TOOLBAR_EDGE), viewport.width - size.width - TOOLBAR_EDGE);
}

/**
 * Where the selection toolbar goes.
 *
 * Mouse: above the selection when there is room, otherwise below.
 *
 * Touch: the browser shows its own selection menu above the selection and it cannot be hidden
 * everywhere (iOS never allows it), so the toolbar goes below the selection, clear of the drag handles.
 * When the selection is so close to the top that the native menu drops below it, the toolbar moves
 * one menu further down; when there is no room below, it goes above, clear of the native menu.
 */
export function selectionToolbarPosition(
  rect: ViewportRect,
  size: ToolbarSize,
  viewport: Viewport,
  touch: boolean,
): ToolbarPosition {
  const left = clampLeft(rect, size, viewport);
  const maxTop = viewport.height - size.height - TOOLBAR_EDGE;

  if (!touch) {
    const above = rect.top - size.height - TOOLBAR_GAP;
    return { top: above >= TOOLBAR_EDGE ? above : Math.min(rect.bottom + TOOLBAR_GAP, maxTop), left };
  }

  // The native menu needs its own height plus the start handle above the text, or it flips below.
  const nativeMenuBelow = rect.top - TOUCH_HANDLE - NATIVE_MENU < TOOLBAR_EDGE;
  const below = rect.bottom + TOUCH_HANDLE + (nativeMenuBelow ? NATIVE_MENU : 0) + TOOLBAR_GAP;
  if (below <= maxTop) return { top: below, left };

  const above = rect.top - TOUCH_HANDLE - NATIVE_MENU - TOOLBAR_GAP - size.height;
  if (above >= TOOLBAR_EDGE) return { top: above, left };

  // A selection taller than the screen: the native menu then floats over the text, the toolbar keeps
  // to the bottom edge.
  return { top: Math.max(maxTop, TOOLBAR_EDGE), left };
}
