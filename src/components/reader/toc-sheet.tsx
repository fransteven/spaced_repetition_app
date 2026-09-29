'use client';

import type { NavItem } from 'epubjs';

import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface TocSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toc: NavItem[];
  currentChapter: string | null;
  onNavigate: (href: string) => void;
}

function TocList({
  items,
  depth,
  currentChapter,
  onNavigate,
}: {
  items: NavItem[];
  depth: number;
  currentChapter: string | null;
  onNavigate: (href: string) => void;
}): React.JSX.Element {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = item.label.trim() === currentChapter;
        return (
          <li key={`${item.id}-${item.href}`}>
            <button
              type="button"
              onClick={() => onNavigate(item.href)}
              className={cn(
                'w-full rounded-lg px-3 py-2.5 text-left text-body-md transition-colors hover:bg-surface-container',
                depth > 0 && 'pl-7 text-body-sm',
                active ? 'bg-surface-container font-semibold text-on-surface' : 'text-on-surface-variant'
              )}
            >
              {item.label.trim()}
            </button>
            {item.subitems && item.subitems.length > 0 && depth < 2 && (
              <TocList items={item.subitems} depth={depth + 1} currentChapter={currentChapter} onNavigate={onNavigate} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function TocSheet({ open, onOpenChange, toc, currentChapter, onNavigate }: TocSheetProps): React.JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full shadow-ambient-lg sm:max-w-sm">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-headline-sm">Contents</SheetTitle>
        </SheetHeader>
        <nav aria-label="Table of contents" className="flex-1 overflow-y-auto px-3 pb-6">
          {toc.length === 0 ? (
            <p className="px-3 text-body-md text-on-surface-variant">This book has no table of contents.</p>
          ) : (
            <TocList items={toc} depth={0} currentChapter={currentChapter} onNavigate={onNavigate} />
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
