'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/components/reader/reader-theme';

const SWATCH_CLASS: Record<HighlightColor, string> = {
  yellow: 'bg-highlight-yellow',
  green: 'bg-highlight-green',
  blue: 'bg-highlight-blue',
  pink: 'bg-highlight-pink',
};

const LABEL: Record<HighlightColor, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
};

interface HighlightSwatchesProps {
  active?: HighlightColor | null;
  onPick: (color: HighlightColor) => void;
}

export function HighlightSwatches({ active = null, onPick }: HighlightSwatchesProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Highlight ${LABEL[color].toLowerCase()}`}
          aria-pressed={active === color}
          onClick={() => onPick(color)}
          className="flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className={cn('flex size-6 items-center justify-center rounded-full', SWATCH_CLASS[color])}>
            {active === color && <Check className="size-3.5 text-on-surface" />}
          </span>
        </button>
      ))}
    </div>
  );
}

export function HighlightDot({ color }: { color: HighlightColor }): React.JSX.Element {
  return <span aria-hidden className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', SWATCH_CLASS[color])} />;
}
