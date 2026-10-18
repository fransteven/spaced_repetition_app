'use client';

import { Type } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DECK_FONT_OPTIONS, parseDeckFontSize } from '@/lib/deck-typography';
import { useDeckFontSize } from '@/hooks/use-deck-font-size';

export function DeckFontSizeSelector(): React.JSX.Element {
  const { fontSize, setFontSize } = useDeckFontSize();

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <span aria-hidden="true" className="flex items-center gap-1.5 text-body-md text-on-surface-variant">
        <Type className="size-4" /> Text size
      </span>
      <Select value={fontSize} onValueChange={(value) => setFontSize(parseDeckFontSize(value))} items={DECK_FONT_OPTIONS}>
        <SelectTrigger aria-label="Deck text size" className="min-h-11 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="shadow-ambient-lg">
          {DECK_FONT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="min-h-11">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
