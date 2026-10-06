'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { DictionaryResultSchema, type DictionaryResult } from '@/lib/dictionary/wiktionary';
import type { TranslateFormValues } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TranslateSection, type Passage } from '@/components/reader/translate-section';

/** Where the panel sits: away from the selection, so the text being read stays visible. */
export interface LookupPlacement {
  vertical: 'top' | 'bottom'; // phones: a half-height card in the other half of the screen
  side: 'left' | 'right'; // tablets and up: a column on the other side
}

interface LookupPanelProps {
  bookId: string;
  bookLanguage: string | null;
  passage: Passage;
  /** Set for a single selected word: show its dictionary entry (translation waits for the button). */
  word: string | null;
  autoTranslate: boolean;
  placement: LookupPlacement;
  pair: TranslateFormValues;
  onPairChange: (pair: TranslateFormValues) => void;
  onCreateCard: (translation: string) => void;
  onClose: () => void;
}

type DictionaryState = { status: 'loading' } | { status: 'ready'; result: DictionaryResult } | { status: 'error' };

function DictionarySection({ word, language }: { word: string; language: string | null }): React.JSX.Element {
  const [state, setState] = useState<{ word: string; value: DictionaryState }>({ word, value: { status: 'loading' } });
  const current: DictionaryState = state.word === word ? state.value : { status: 'loading' };

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ word });
    if (language) params.set('lang', language);
    const load = async (): Promise<DictionaryState> => {
      const response = await fetch(`/api/dictionary?${params.toString()}`, { signal: controller.signal });
      const body: unknown = await response.json();
      const envelope = DictionaryResultSchema.safeParse(
        body && typeof body === 'object' && 'data' in body ? body.data : null
      );
      return envelope.success ? { status: 'ready', result: envelope.data } : { status: 'error' };
    };
    load()
      .then((value) => setState({ word, value }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ word, value: { status: 'error' } });
      });
    return () => controller.abort();
  }, [word, language]);

  if (current.status === 'loading') {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }
  if (current.status === 'error' || current.result.entries.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant">
        {current.status === 'error' ? 'The dictionary is unavailable right now.' : `No dictionary entry for “${word}”.`}
      </p>
    );
  }

  const { entries, source_url: sourceUrl } = current.result;
  const languages = new Set(entries.map((entry) => entry.language));
  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={`${entry.word}-${entry.language}-${entry.partOfSpeech}-${index}`} className="space-y-1.5">
          <p className="text-body-sm italic text-on-surface-variant">
            {entry.partOfSpeech}
            {entry.word.toLowerCase() !== word.toLowerCase() && ` · ${entry.word}`}
            {languages.size > 1 && ` · ${entry.language}`}
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-body-md text-on-surface">
            {entry.senses.map((sense, senseIndex) => (
              <li key={senseIndex}>
                {sense.definition}
                {sense.examples.map((example) => (
                  <p key={example} className="mt-0.5 text-body-sm italic text-on-surface-variant">
                    {example}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        </div>
      ))}
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
      >
        See in Wiktionary
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}

/**
 * Non-modal lookup card (Kindle-style): dictionary for a single word plus translation.
 * No backdrop and no blur — the book stays readable and the selection stays marked.
 */
export function LookupPanel({
  bookId,
  bookLanguage,
  passage,
  word,
  autoTranslate,
  placement,
  pair,
  onPairChange,
  onCreateCard,
  onClose,
}: LookupPanelProps): React.JSX.Element {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={word ? `Look up “${word}”` : 'Translate'}
      data-testid="lookup-panel"
      className={cn(
        'fixed inset-x-2 z-30 flex max-h-[45dvh] animate-pop-in flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-ambient-lg',
        placement.vertical === 'top' ? 'top-2' : 'bottom-2',
        'sm:inset-x-auto sm:top-20 sm:bottom-14 sm:max-h-none sm:w-96',
        placement.side === 'left' ? 'sm:left-4' : 'sm:right-4'
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 className="min-w-0 truncate text-headline-sm text-on-surface">{word ?? 'Translate'}</h2>
        <Button variant="ghost" size="icon-lg" className="shrink-0 rounded-full" aria-label="Close" onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5">
        {word && (
          <section aria-label="Dictionary" className="rounded-xl bg-surface-container-low p-4">
            <p className="mb-2 text-label-sm uppercase text-on-surface-variant">Dictionary</p>
            <DictionarySection word={word} language={bookLanguage} />
          </section>
        )}
        <section aria-label="Translation">
          <TranslateSection
            key={`${autoTranslate}|${passage.text}`}
            bookId={bookId}
            passage={passage}
            pair={pair}
            onPairChange={onPairChange}
            autoStart={autoTranslate}
            showSource={!word}
            onCreateCard={onCreateCard}
          />
        </section>
      </div>
    </div>
  );
}
