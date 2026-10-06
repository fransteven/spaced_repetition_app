'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeftRight, Copy, Languages, RotateCw, SquareStack } from 'lucide-react';

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
import { Skeleton } from '@/components/ui/skeleton';
import { AI_STARTING_HINT, useSlowStart } from '@/hooks/use-slow-start';

export interface Passage {
  text: string;
  context: string | null;
}

interface TranslateSectionProps {
  bookId: string;
  passage: Passage;
  /** Last pair used in this book (the server also stores it on every translation). */
  pair: TranslateFormValues;
  onPairChange: (pair: TranslateFormValues) => void;
  /** Translate right away; otherwise wait for the button (a word lookup must not spend the daily cap). */
  autoStart: boolean;
  /** Hide the source text when the panel already shows it (a looked-up word is its title). */
  showSource: boolean;
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
  label,
  value,
  withAuto,
  detected,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  withAuto: boolean;
  detected: string | null;
  onChange: (value: string) => void;
}): React.JSX.Element {
  const display = (code: string | null): string => {
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
      <SelectTrigger id={id} aria-label={label} className="h-10 min-w-0 flex-1 rounded-full bg-card text-body-md shadow-ambient">
        <SelectValue>{(current: string | null) => display(current)}</SelectValue>
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

/** Google Translate-style block: source → target over a passage or a looked-up word. */
export function TranslateSection({
  bookId,
  passage,
  pair: initialPair,
  onPairChange,
  autoStart,
  showSource,
  onCreateCard,
}: TranslateSectionProps): React.JSX.Element {
  const { control, setValue, getValues } = useForm<TranslateFormValues>({
    resolver: zodResolver(TranslateFormSchema),
    defaultValues: initialPair,
  });
  const watched = useWatch({ control });
  const from = watched.from ?? initialPair.from;
  const to = watched.to ?? initialPair.to;

  const [started, setStarted] = useState(autoStart);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);

  const key = `${from}|${to}|${attempt}|${passage.text}`;
  const current = outcome?.key === key ? outcome : null;
  const loading = started && !current;
  const startingService = useSlowStart(loading);

  useEffect(() => {
    if (!started) return;
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
  }, [started, passage, bookId, from, to, key]);

  const apply = (next: TranslateFormValues): void => {
    setValue('from', next.from);
    setValue('to', next.to);
    onPairChange(next);
  };

  const change = (field: keyof TranslateFormValues, value: string): void => {
    const parsed = TranslateFormSchema.safeParse({ ...getValues(), [field]: value });
    if (parsed.success) apply(parsed.data);
  };

  const detected = from === AUTO_DETECT ? toLanguageCode(current?.sourceLang) : null;

  const swap = (): void => {
    const source = from === AUTO_DETECT ? detected : toLanguageCode(from);
    if (!source || source === to) return;
    apply({ from: to, to: source });
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <LanguageSelect
          id="translate-from"
          label="Translate from"
          value={from}
          withAuto
          detected={detected}
          onChange={(value) => change('from', value)}
        />
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
        <LanguageSelect
          id="translate-to"
          label="Translate to"
          value={to}
          withAuto={false}
          detected={null}
          onChange={(value) => change('to', value)}
        />
      </div>

      {showSource && (
        <section className="rounded-xl bg-surface-container-low p-4">
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap font-reader text-body-lg text-on-surface">{passage.text}</p>
        </section>
      )}

      {!started ? (
        <Button className="w-full" onClick={() => setStarted(true)}>
          <Languages />
          Translate to {languageLabel(to)}
        </Button>
      ) : (
        <section aria-live="polite" className="rounded-xl bg-card p-4 shadow-ambient">
          <p className="mb-2 text-label-sm uppercase text-on-surface-variant">{languageLabel(to)}</p>
          {loading ? (
            <div className="space-y-2">
              {startingService && <p className="text-label-md text-on-surface-variant">{AI_STARTING_HINT}</p>}
              <Skeleton className="h-4 w-11/12" />
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
            <p className="max-h-60 overflow-y-auto whitespace-pre-wrap font-reader text-body-lg text-on-surface">
              {current?.translation}
            </p>
          )}
        </section>
      )}

      {started && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" disabled={!current?.translation} onClick={() => void copy()}>
            <Copy />
            Copy
          </Button>
          <Button disabled={!current?.translation} onClick={() => current?.translation && onCreateCard(current.translation)}>
            <SquareStack />
            Create card
          </Button>
        </div>
      )}
    </div>
  );
}
