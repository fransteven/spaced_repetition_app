'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowUp, BookOpenText } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { AskSource } from '@/lib/services/book-rag-service';
import { askBookAction } from '@/app/actions/reader-actions';
import { AskBookFormSchema, type AskBookFormValues } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FilterChip } from '@/components/primitives/filter-chip';

const INDEX_POLL_MS = 5000;
const INDEX_POLL_LIMIT = 60; // ~5 minutes
const HISTORY_TURNS = 6;

const SUGGESTIONS = [
  'Summarize this chapter',
  'What is the main idea so far?',
  'Explain the key terms in this chapter',
];

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  answerable?: boolean;
  sources?: AskSource[];
}

interface AskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  /** href of the page being read — limits answers to what has been read. */
  positionHref: string | null;
  onOpenSource: (source: AskSource) => void;
}

export function AskSheet({ open, onOpenChange, bookId, positionHref, onOpenSource }: AskSheetProps): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [scope, setScope] = useState<'read' | 'all'>('read');
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'indexing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(1);
  const alive = useRef(true);
  const endRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AskBookFormValues>({
    resolver: zodResolver(AskBookFormSchema),
    defaultValues: { question: '' },
  });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, phase]);

  const ask = async ({ question }: AskBookFormValues): Promise<void> => {
    if (phase !== 'idle') return;
    setError(null);
    const history = messages.slice(-HISTORY_TURNS).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { id: nextId.current++, role: 'user', content: question }]);
    reset({ question: '' });
    setPhase('thinking');

    // A book that has never been indexed is queued on the first question;
    // keep asking (cheap while indexing) until its index is ready.
    for (let attempt = 0; attempt < INDEX_POLL_LIMIT && alive.current; attempt++) {
      const result = await askBookAction({ book_id: bookId, question, history, scope, position_href: positionHref });
      if (!alive.current) return;
      if (!result.data) {
        setError(result.error?.message ?? 'Could not answer');
        setPhase('idle');
        return;
      }
      if (result.data.status === 'answered') {
        const { answer, answerable, sources } = result.data;
        setMessages((current) => [...current, { id: nextId.current++, role: 'assistant', content: answer, answerable, sources }]);
        setPhase('idle');
        return;
      }
      setPhase('indexing');
      await new Promise((resolve) => setTimeout(resolve, INDEX_POLL_MS));
    }
    if (alive.current) {
      setError('Preparing the book is taking longer than expected. Try again in a few minutes.');
      setPhase('idle');
    }
  };

  // Built per event (not during render): `ask` reads refs.
  const submit = (event?: React.BaseSyntheticEvent): Promise<void> => handleSubmit(ask)(event);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full shadow-ambient-lg sm:max-w-md">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-headline-sm">Ask this book</SheetTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <FilterChip active={scope === 'read'} onClick={() => setScope('read')}>
              Up to where I am
            </FilterChip>
            <FilterChip active={scope === 'all'} onClick={() => setScope('all')}>
              Whole book
            </FilterChip>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4" aria-live="polite">
          {messages.length === 0 && phase === 'idle' && (
            <div className="space-y-3 pt-2">
              <p className="text-body-md text-on-surface-variant">
                Answers come only from the book and cite the passages they use.
                {scope === 'read' && ' Nothing beyond your current page is used, so no spoilers.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="ghost"
                    size="sm"
                    className="h-auto max-w-full shrink whitespace-normal rounded-full bg-surface-container px-3 py-1.5 text-left"
                    onClick={() => {
                      setValue('question', suggestion);
                      void submit();
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === 'user' ? (
              <p
                key={message.id}
                className="ml-auto w-fit max-w-[85%] rounded-2xl bg-primary/10 px-4 py-2.5 text-body-md text-on-surface"
              >
                {message.content}
              </p>
            ) : (
              <div key={message.id} className="space-y-3 rounded-2xl bg-card p-4 shadow-ambient">
                <MarkdownContent
                  content={message.content}
                  size="sm"
                  className={cn('text-body-md leading-relaxed', !message.answerable && 'text-on-surface-variant')}
                />
                {message.sources && message.sources.length > 0 && (
                  <ul className="space-y-1.5">
                    {message.sources.map((source) => (
                      <li key={source.chunk_id}>
                        <button
                          type="button"
                          onClick={() => onOpenSource(source)}
                          className="flex w-full items-start gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-left transition-colors hover:bg-surface-container"
                        >
                          <span className="text-label-sm font-semibold text-primary tabular">[{source.n}]</span>
                          <span className="min-w-0">
                            <span className="block truncate text-label-md text-on-surface">
                              {source.section_title ?? 'Passage'}
                            </span>
                            <span className="line-clamp-2 font-reader text-body-sm text-on-surface-variant">
                              {source.excerpt}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          )}

          {phase === 'thinking' && (
            <div className="space-y-2 rounded-2xl bg-card p-4 shadow-ambient">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
          {phase === 'indexing' && (
            <div className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
              <BookOpenText className="mt-0.5 size-5 shrink-0 animate-pulse text-primary" />
              <p className="text-body-md text-on-surface-variant">
                Reading the book for the first time so it can answer questions. A long book takes a minute or two —
                your question will be answered as soon as it is ready.
              </p>
            </div>
          )}
          {error && <p className="text-body-sm text-destructive">{error}</p>}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="flex items-end gap-2 px-5 pb-5">
          <div className="min-w-0 flex-1">
            <Textarea
              rows={2}
              placeholder="Ask about characters, ideas, events…"
              aria-label="Your question"
              aria-invalid={errors.question ? true : undefined}
              disabled={phase !== 'idle'}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              {...register('question')}
            />
            {errors.question && <p className="pt-1 text-body-sm text-destructive">{errors.question.message}</p>}
          </div>
          <Button type="submit" size="icon-lg" className="rounded-full" aria-label="Ask" disabled={phase !== 'idle'}>
            <ArrowUp />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
