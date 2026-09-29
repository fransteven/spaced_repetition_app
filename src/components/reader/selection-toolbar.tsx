'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Copy, NotebookPen, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { HighlightSwatches } from '@/components/reader/highlight-swatches';
import type { HighlightColor } from '@/components/reader/reader-theme';
import type { ViewportRect } from '@/components/reader/use-epub-reader';

const GAP = 10;
const EDGE = 8;

interface SelectionToolbarProps {
  rect: ViewportRect;
  activeColor?: HighlightColor | null;
  onColor: (color: HighlightColor) => void;
  onNote: () => void;
  onCopy: () => void;
  onDelete?: () => void;
}

/**
 * Floating toolbar over a text selection or an existing highlight.
 * Built to grow: phase 2 adds "Translate" and "Create card" here.
 */
export function SelectionToolbar({
  rect,
  activeColor = null,
  onColor,
  onNote,
  onCopy,
  onDelete,
}: SelectionToolbarProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Above the selection when there is room, otherwise below; clamped to the viewport.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const { width, height } = node.getBoundingClientRect();
    const above = rect.top - height - GAP;
    const top = above >= EDGE ? above : Math.min(rect.bottom + GAP, window.innerHeight - height - EDGE);
    const centered = rect.left + rect.width / 2 - width / 2;
    const left = Math.min(Math.max(centered, EDGE), window.innerWidth - width - EDGE);
    setPosition({ top, left });
  }, [rect]);

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Selection actions"
      onMouseDown={(event) => event.preventDefault()}
      className="fixed z-40 flex animate-pop-in items-center gap-1 rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-ambient-lg"
      style={position ? { top: position.top, left: position.left } : { top: -9999, left: -9999 }}
    >
      <div className="mr-1 rounded-full bg-surface-container px-0.5">
        <HighlightSwatches active={activeColor} onPick={onColor} />
      </div>
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
