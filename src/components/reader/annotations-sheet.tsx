'use client';

import { useState } from 'react';
import { Bookmark, Highlighter, NotebookPen, Trash2 } from 'lucide-react';

import type { BookAnnotation } from '@/lib/services/annotation-service';
import type { BookBookmark } from '@/lib/services/bookmark-service';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/primitives/filter-chip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HighlightDot } from '@/components/reader/highlight-swatches';

interface AnnotationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annotations: BookAnnotation[];
  bookmarks: BookBookmark[];
  onNavigate: (cfi: string) => void;
  onEditNote: (annotation: BookAnnotation) => void;
  onDelete: (annotation: BookAnnotation) => void;
  onDeleteBookmark: (bookmark: BookBookmark) => void;
}

type Tab = 'highlights' | 'bookmarks';

function groupByChapter(annotations: BookAnnotation[]): Array<[string, BookAnnotation[]]> {
  const groups = new Map<string, BookAnnotation[]>();
  for (const annotation of annotations) {
    const key = annotation.chapter_label ?? 'Untitled section';
    groups.set(key, [...(groups.get(key) ?? []), annotation]);
  }
  return [...groups.entries()];
}

export function AnnotationsSheet({
  open,
  onOpenChange,
  annotations,
  bookmarks,
  onNavigate,
  onEditNote,
  onDelete,
  onDeleteBookmark,
}: AnnotationsSheetProps): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('highlights');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full shadow-ambient-lg sm:max-w-md">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-headline-sm">
            {tab === 'highlights' ? 'Highlights & notes' : 'Bookmarks'}{' '}
            <span className="tabular text-on-surface-variant">
              ({tab === 'highlights' ? annotations.length : bookmarks.length})
            </span>
          </SheetTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <FilterChip active={tab === 'highlights'} onClick={() => setTab('highlights')}>
              Highlights
            </FilterChip>
            <FilterChip active={tab === 'bookmarks'} onClick={() => setTab('bookmarks')}>
              Bookmarks
            </FilterChip>
          </div>
        </SheetHeader>
        {tab === 'bookmarks' ? (
          <BookmarkList bookmarks={bookmarks} onNavigate={onNavigate} onDelete={onDeleteBookmark} />
        ) : (
          <div className="flex-1 space-y-8 overflow-y-auto px-5 pb-8">
            {annotations.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Highlighter className="size-8 text-on-surface-variant" />
                <p className="max-w-xs text-body-md text-on-surface-variant">
                  Select any passage to highlight it or add a note.
                </p>
              </div>
            )}
            {groupByChapter(annotations).map(([chapter, items]) => (
              <section key={chapter} className="space-y-3">
                <h3 className="text-label-md uppercase text-on-surface-variant">{chapter}</h3>
                <ul className="space-y-3">
                  {items.map((annotation) => (
                    <li key={annotation.id} className="rounded-xl bg-surface-container-low p-4">
                      <button
                        type="button"
                        onClick={() => onNavigate(annotation.cfi_range)}
                        className="flex w-full gap-3 text-left"
                      >
                        <HighlightDot color={annotation.color} />
                        <span className="line-clamp-4 text-body-lg text-on-surface">
                          {annotation.quote}
                        </span>
                      </button>
                      {annotation.note && (
                        <p className="mt-3 whitespace-pre-line pl-5 text-body-md text-on-surface-variant">
                          {annotation.note}
                        </p>
                      )}
                      <div className="mt-2 flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEditNote(annotation)}>
                          <NotebookPen data-icon="inline-start" />
                          {annotation.note ? 'Edit note' : 'Add note'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          aria-label="Delete highlight"
                          onClick={() => onDelete(annotation)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BookmarkList({
  bookmarks,
  onNavigate,
  onDelete,
}: {
  bookmarks: BookBookmark[];
  onNavigate: (cfi: string) => void;
  onDelete: (bookmark: BookBookmark) => void;
}): React.JSX.Element {
  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center gap-3 px-5 py-16 text-center">
        <Bookmark className="size-8 text-on-surface-variant" />
        <p className="max-w-xs text-body-md text-on-surface-variant">
          Tap the bookmark at the top of any page to mark where you left off.
        </p>
      </div>
    );
  }
  return (
    <ul className="flex-1 space-y-3 overflow-y-auto px-5 pb-8">
      {[...bookmarks]
        .sort((a, b) => a.progress - b.progress)
        .map((bookmark) => (
          <li key={bookmark.id} className="flex items-start gap-2 rounded-xl bg-surface-container-low p-4">
            <button type="button" onClick={() => onNavigate(bookmark.cfi)} className="flex min-w-0 flex-1 gap-3 text-left">
              <Bookmark className="mt-0.5 size-4 shrink-0 fill-primary text-primary" />
              <span className="min-w-0 space-y-1">
                <span className="flex gap-2 text-label-md uppercase text-on-surface-variant">
                  <span className="truncate">{bookmark.chapter_label ?? 'Untitled section'}</span>
                  <span className="shrink-0 tabular">{Math.round(bookmark.progress * 100)}%</span>
                </span>
                {bookmark.excerpt && (
                  <span className="line-clamp-2 font-reader text-body-md text-on-surface">{bookmark.excerpt}</span>
                )}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              aria-label="Delete bookmark"
              onClick={() => onDelete(bookmark)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
    </ul>
  );
}
