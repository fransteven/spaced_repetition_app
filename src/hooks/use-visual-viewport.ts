'use client';

import { useEffect, useState } from 'react';

export interface VisualViewportBox {
  /** Visible height in CSS px (shrinks when the on-screen keyboard opens). */
  height: number;
  /** Distance the visible area is scrolled down from the layout viewport's top. */
  offsetTop: number;
  /** True while the on-screen keyboard (or similar) covers part of the screen. */
  keyboardOpen: boolean;
}

// Below this, a shrink is browser chrome (URL bar) rather than a keyboard.
const KEYBOARD_THRESHOLD_PX = 120;

/**
 * Tracks the part of the screen the user can see. Mobile browsers (iOS Safari,
 * Chrome on Android) open the keyboard over the page without resizing the
 * layout viewport, so a `fixed` element sized with vh/dvh ends up under it.
 * Returns null until mounted, or when the browser has no visualViewport.
 */
export function useVisualViewport(active: boolean = true): VisualViewportBox | null {
  const [box, setBox] = useState<VisualViewportBox | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;

    let frame = 0;
    const update = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setBox({
          height:       vv.height,
          offsetTop:    vv.offsetTop,
          keyboardOpen: window.innerHeight - vv.height > KEYBOARD_THRESHOLD_PX,
        });
      });
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      setBox(null);
    };
  }, [active]);

  return box;
}
