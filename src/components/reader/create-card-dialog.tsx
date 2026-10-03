'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';

import type { BookDeckOptions, CreatedBookCard } from '@/lib/services/book-card-service';
import { createBookCardAction, suggestBookCardAction } from '@/app/actions/reader-actions';
import { BookCardFormSchema, NEW_DECK_VALUE, type BookCardFormValues } from '@/lib/validations';
import type { HighlightColor } from '@/components/reader/reader-theme';
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AI_STARTING_HINT, useSlowStart } from '@/hooks/use-slow-start';

export interface CardDraftSource {
  quote: string;
  context: string | null;
  chapterLabel: string | null;
  /** Existing highlight, or the selection a new highlight is made from. */
  annotationId: string | null;
  selection: { cfi_range: string; quote: string; chapter_label: string | null; color: HighlightColor } | null;
  /** Set when the card starts from the translate panel. */
  translation: string | null;
}

interface CreateCardDialogProps {
  bookId: string;
  bookTitle: string;
  source: CardDraftSource;
  deckOptions: BookDeckOptions;
  onCreated: (created: CreatedBookCard) => void;
  onClose: () => void;
}

export function CreateCardDialog({
  bookId,
  bookTitle,
  source,
  deckOptions,
  onCreated,
  onClose,
}: CreateCardDialogProps): React.JSX.Element {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookCardFormValues>({
    resolver: zodResolver(BookCardFormSchema),
    defaultValues: {
      deck_id: deckOptions.default_deck_id ?? deckOptions.decks[0]?.id ?? NEW_DECK_VALUE,
      new_deck_name: bookTitle.slice(0, 100),
      front: source.translation ? source.quote.slice(0, 2000) : '',
      back: source.translation ? source.translation.slice(0, 2000) : '',
    },
  });
  const deckId = useWatch({ control, name: 'deck_id' });

  const [suggesting, setSuggesting] = useState(false);
  const startingService = useSlowStart(suggesting);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const suggest = useCallback(async (): Promise<void> => {
    setSuggesting(true);
    setSubmitError(null);
    const result = await suggestBookCardAction({
      book_id: bookId,
      quote: source.quote,
      context: source.context,
      chapter_label: source.chapterLabel,
      translation: source.translation,
    });
    setSuggesting(false);
    if (!result.data) {
      setSubmitError(result.error?.message ?? 'Could not suggest a card');
      return;
    }
    setValue('front', result.data.front, { shouldValidate: true });
    setValue('back', result.data.back, { shouldValidate: true });
  }, [bookId, source, setValue]);

  // A plain selection starts with an AI draft; a translation is already one.
  const autoSuggested = useRef(false);
  useEffect(() => {
    if (autoSuggested.current || source.translation) return;
    // Flag inside the timer: StrictMode's mount/cleanup/mount must not skip it.
    const timer = window.setTimeout(() => {
      autoSuggested.current = true;
      void suggest();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [source.translation, suggest]);

  const deckLabel = (value: string | null): string => {
    if (value === NEW_DECK_VALUE) return 'New deck…';
    return deckOptions.decks.find((deck) => deck.id === value)?.name ?? 'Choose a deck';
  };

  const onSubmit = async (values: BookCardFormValues): Promise<void> => {
    setSubmitError(null);
    const result = await createBookCardAction({
      book_id: bookId,
      deck: values.deck_id === NEW_DECK_VALUE ? { new_name: values.new_deck_name } : { id: values.deck_id },
      front: values.front,
      back: values.back,
      annotation_id: source.annotationId,
      selection: source.annotationId ? null : source.selection,
    });
    if (!result.data) {
      setSubmitError(result.error?.message ?? 'Could not create the card');
      return;
    }
    onCreated(result.data);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogTitle>Create card</DialogTitle>
          <DialogDescription className="line-clamp-3 italic">“{source.quote}”</DialogDescription>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="book-card-deck">Deck</Label>
              <Controller
                control={control}
                name="deck_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (typeof value === 'string') field.onChange(value);
                    }}
                  >
                    <SelectTrigger
                      id="book-card-deck"
                      className="h-10 w-full text-body-md"
                      aria-invalid={Boolean(errors.deck_id)}
                    >
                      <SelectValue>{(value: string | null) => deckLabel(value)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {deckOptions.decks.map((deck) => (
                        <SelectItem key={deck.id} value={deck.id}>
                          {deck.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_DECK_VALUE}>New deck…</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {deckId === NEW_DECK_VALUE && (
                <Input
                  aria-label="New deck name"
                  placeholder="Deck name"
                  aria-invalid={Boolean(errors.new_deck_name)}
                  {...register('new_deck_name')}
                />
              )}
              {errors.new_deck_name && <p className="text-body-sm text-destructive">{errors.new_deck_name.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="book-card-front">Question (front)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  disabled={suggesting}
                  onClick={() => void suggest()}
                >
                  <Sparkles className={suggesting ? 'animate-pulse' : undefined} />
                  {suggesting ? 'Writing…' : 'Suggest with AI'}
                </Button>
              </div>
              <Textarea
                id="book-card-front"
                rows={3}
                disabled={suggesting}
                placeholder={suggesting ? (startingService ? AI_STARTING_HINT : 'Drafting a question from this passage…') : 'What is the question?'}
                aria-invalid={Boolean(errors.front)}
                {...register('front')}
              />
              {errors.front && <p className="text-body-sm text-destructive">{errors.front.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="book-card-back">Answer (back)</Label>
              <Textarea
                id="book-card-back"
                rows={3}
                disabled={suggesting}
                placeholder="What is the answer?"
                aria-invalid={Boolean(errors.back)}
                {...register('back')}
              />
              {errors.back && <p className="text-body-sm text-destructive">{errors.back.message}</p>}
            </div>

            {submitError && <p className="text-body-sm text-destructive">{submitError}</p>}

            <div className="flex items-center justify-end gap-3">
              <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || suggesting}>
                {isSubmitting ? 'Saving…' : 'Add card'}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
