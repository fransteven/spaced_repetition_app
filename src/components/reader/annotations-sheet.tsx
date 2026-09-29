'use client';

import { Highlighter, NotebookPen, Trash2 } from 'lucide-react';

import type { BookAnnotation } from '@/lib/services/annotation-service';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HighlightDot } from '@/components/reader/highlight-swatches';

interface AnnotationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annotations: BookAnnotation[];
  onNavigate: (cfi: string) => void;
  onEditNote: (annotation: BookAnnotation) => void;
  onDelete: (annotation: BookAnnotation) => void;
}

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
  onNavigate,
  onEditNote,
  onDelete,
}: AnnotationsSheetProps): React.JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full shadow-ambient-lg sm:max-w-md">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-headline-sm">
            Highlights & notes <span className="tabular text-on-surface-variant">({annotations.length})</span>
          </SheetTitle>
        </SheetHeader>
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
      </SheetContent>
    </Sheet>
  );
}
