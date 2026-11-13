'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Copy, Languages, NotebookPen, SquareStack, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { HighlightSwatches } from '@/components/reader/highlight-swatches';
import type { HighlightColor } from '@/components/reader/reader-theme';
import { TOOLBAR_EDGE, selectionToolbarPosition } from '@/components/reader/selection-toolbar-position';
import type { ViewportRect } from '@/components/reader/use-epub-reader';

interface SelectionToolbarProps {
  rect: ViewportRect;
  activeColor?: HighlightColor | null;
  onColor: (color: HighlightColor) => void;
  onTranslate: () => void;
  onCard: () => void;
  onNote: () => void;
  onCopy: () => void;
  onDelete?: () => void;
}

/** Floating toolbar over a text selection or an existing highlight. */
export function SelectionToolbar({
  rect,
  activeColor = null,
  onColor,
  onTranslate,
  onCard,
  onNote,
  onCopy,
  onDelete,
}: SelectionToolbarProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Placed by selectionToolbarPosition(): on touch screens below the selection, so the browser's own
  // selection menu (which sits above it) never covers the toolbar. The measured width is pinned: moved
  // next to the screen edge, the toolbar would otherwise wrap onto a second row, grow taller than
  // measured and cover the very text it is about.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Layout size, not getBoundingClientRect(): the pop-in animation scales the toolbar while it opens.
    const width = node.offsetWidth + 1;
    const height = node.offsetHeight;
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const { top, left } = selectionToolbarPosition(
      rect,
      { width, height },
      { width: window.innerWidth, height: window.innerHeight },
      touch,
    );
    setPosition({ top, left, width });
  }, [rect]);

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Selection actions"
      onMouseDown={(event) => event.preventDefault()}
      className="fixed z-40 flex max-w-[calc(100vw-1rem)] animate-pop-in flex-wrap items-center justify-center gap-1 rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-ambient-lg"
      style={position ? { top: position.top, left: position.left, width: position.width } : { top: -9999, left: TOOLBAR_EDGE }}
    >
      <div className="mr-1 rounded-full bg-surface-container px-0.5">
        <HighlightSwatches active={activeColor} onPick={onColor} />
      </div>
      <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Translate" onClick={onTranslate}>
        <Languages />
      </Button>
      <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Create card" onClick={onCard}>
        <SquareStack />
      </Button>
      <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Add note" onClick={onNote}>
        <NotebookPen />
      </Button>
      <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Copy text" onClick={onCopy}>
        <Copy />
      </Button>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon-lg"
          className="rounded-full text-destructive"
          aria-label="Delete highlight"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
