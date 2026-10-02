'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeftRight, Copy, RotateCw, SquareStack } from 'lucide-react';

import { translateSelectionAction } from '@/app/actions/reader-actions';
import {
  AUTO_DETECT,
  TRANSLATION_LANGUAGES,
  languageLabel,
  toLanguageCode,
} from '@/lib/translation/languages';
import { TranslateFormSchema, type TranslateFormValues } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

export interface Passage {
  text: string;
  context: string | null;
}

interface TranslateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  passage: Passage | null;
  /** Last pair used for this book; the server stores it on every translation. */
  initialPair: TranslateFormValues;
  onCreateCard: (translation: string) => void;
}

interface Outcome {
  key: string;
  translation: string | null;
  sourceLang: string | null;
  error: string | null;
}

function LanguageSelect({
  id,
  value,
  withAuto,
  detected,
  onChange,
}: {
  id: string;
  value: string;
  withAuto: boolean;
  detected: string | null;
  onChange: (value: string) => void;
}): React.JSX.Element {
  const label = (code: string | null): string => {
    // Auto-detect shows the detected language; the menu keeps "Detect language" checked.
    if (code === AUTO_DETECT) return detected ? languageLabel(detected) : 'Detect';
    return code ? languageLabel(code) : '';
  };
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (typeof next === 'string') onChange(next);
      }}
    >
      <SelectTrigger id={id} className="h-10 min-w-0 flex-1 rounded-full bg-card text-body-md shadow-ambient">
        <SelectValue>{(current: string | null) => label(current)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {withAuto && <SelectItem value={AUTO_DETECT}>Detect language</SelectItem>}
        {TRANSLATION_LANGUAGES.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Google Translate-style panel: source → target over the selected passage. */
export function TranslateSheet({
  open,
  onOpenChange,
  bookId,
  passage,
  initialPair,
  onCreateCard,
}: TranslateSheetProps): React.JSX.Element {
  const { control, setValue, getValues } = useForm<TranslateFormValues>({
    resolver: zodResolver(TranslateFormSchema),
    defaultValues: initialPair,
  });
  const pair = useWatch({ control });
  const from = pair.from ?? initialPair.from;
  const to = pair.to ?? initialPair.to;

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);

  const key = passage ? `${from}|${to}|${attempt}|${passage.text}` : '';
  const current = outcome?.key === key ? outcome : null;
  const loading = Boolean(open && passage && !current);

  useEffect(() => {
    if (!open || !passage) return;
    let cancelled = false;
    void translateSelectionAction({ book_id: bookId, text: passage.text, context: passage.context, from, to }).then(
      (result) => {
        if (cancelled) return;
        setOutcome({
          key,
          translation: result.data?.translation ?? null,
          sourceLang: result.data?.source_lang ?? null,
          error: result.data ? null : (result.error?.message ?? 'Could not translate'),
        });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [open, passage, bookId, from, to, key]);

  const change = (field: keyof TranslateFormValues, value: string): void => {
    const parsed = TranslateFormSchema.safeParse({ ...getValues(), [field]: value });
    if (!parsed.success) return;
    setValue('from', parsed.data.from);
    setValue('to', parsed.data.to);
  };

  const detected = from === AUTO_DETECT ? toLanguageCode(current?.sourceLang) : null;

  const swap = (): void => {
    const source = from === AUTO_DETECT ? detected : toLanguageCode(from);
    if (!source || source === to) return;
    setValue('from', to);
    setValue('to', source);
  };

  const copy = async (): Promise<void> => {
    if (!current?.translation) return;
    try {
      await navigator.clipboard.writeText(current.translation);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full shadow-ambient-lg sm:max-w-md">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-headline-sm">Translate</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-8">
          <div className="flex items-center gap-2">
            <LanguageSelect id="translate-from" value={from} withAuto detected={detected} onChange={(value) => change('from', value)} />
            <Button
              variant="ghost"
              size="icon-lg"
              className="shrink-0 rounded-full"
              aria-label="Swap languages"
              disabled={from === AUTO_DETECT && !detected}
              onClick={swap}
            >
              <ArrowLeftRight />
            </Button>
            <LanguageSelect id="translate-to" value={to} withAuto={false} detected={null} onChange={(value) => change('to', value)} />
          </div>

          <section className="rounded-2xl bg-surface-container-low p-4">
            <p className="max-h-60 overflow-y-auto whitespace-pre-wrap font-reader text-body-lg text-on-surface">
              {passage?.text}
            </p>
          </section>

          <section aria-live="polite" className="rounded-2xl bg-card p-4 shadow-ambient">
            <p className="mb-2 text-label-sm uppercase text-on-surface-variant">{languageLabel(to)}</p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : current?.error ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-body-md text-destructive">{current.error}</p>
                <Button variant="ghost" size="sm" onClick={() => setAttempt((value) => value + 1)}>
                  <RotateCw />
                  Retry
                </Button>
              </div>
            ) : (
              <p className="max-h-72 overflow-y-auto whitespace-pre-wrap font-reader text-body-lg text-on-surface">
                {current?.translation}
              </p>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" disabled={!current?.translation} onClick={() => void copy()}>
              <Copy />
              Copy
            </Button>
            <Button
              disabled={!current?.translation}
              onClick={() => current?.translation && onCreateCard(current.translation)}
            >
              <SquareStack />
              Create card
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
