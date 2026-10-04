'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  ALargeSmall,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  List,
  Maximize,
  MessageCircleQuestion,
  Minimize,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ReaderBook } from '@/lib/services/book-service';
import type { BookAnnotation } from '@/lib/services/annotation-service';
import type { ReaderPreferences } from '@/lib/services/reader-preferences-service';
import {
  createAnnotationAction,
  deleteAnnotationAction,
  saveBookLocationsAction,
  saveReadingProgressAction,
  updateAnnotationAction,
  updateReaderPreferencesAction,
} from '@/app/actions/reader-actions';
import { Button } from '@/components/ui/button';
import { MasteryThread } from '@/components/primitives/mastery-thread';
import { buildReaderCss, readReaderTokens, type HighlightColor, type ReaderTokens } from '@/components/reader/reader-theme';
import {
  useEpubReader,
  type ReaderLocation,
  type TextSelection,
  type ViewportRect,
} from '@/components/reader/use-epub-reader';
import { useFullscreen } from '@/components/reader/use-fullscreen';
import { SelectionToolbar } from '@/components/reader/selection-toolbar';
import { AnnotationNoteDialog } from '@/components/reader/annotation-note-dialog';
import { AnnotationsSheet } from '@/components/reader/annotations-sheet';
import { TocSheet } from '@/components/reader/toc-sheet';
import { ReaderSettingsSheet } from '@/components/reader/reader-settings-sheet';
import { TranslateSheet } from '@/components/reader/translate-sheet';
import { AskSheet } from '@/components/reader/ask-sheet';
import { CreateCardDialog, type CardDraftSource } from '@/components/reader/create-card-dialog';
import type { BookDeckOptions, CreatedBookCard } from '@/lib/services/book-card-service';
import { AUTO_DETECT, toLanguageCode, type LanguageCode } from '@/lib/translation/languages';
import type { TranslateFormValues } from '@/lib/validations';

const PROGRESS_DEBOUNCE_MS = 2000;
const PREFS_DEBOUNCE_MS = 600;

interface ReaderProps {
  book: ReaderBook;
  initialAnnotations: BookAnnotation[];
  initialPreferences: ReaderPreferences;
  initialDeckOptions: BookDeckOptions;
  startCfi: string | null;
}

type Panel = 'toc' | 'notes' | 'settings' | 'translate' | 'ask' | null;

/** Last pair for this book, else the reader's own language (or Spanish/English). */
function initialTranslatePair(book: ReaderBook): TranslateFormValues {
  const bookLanguage = toLanguageCode(book.language);
  const browser = typeof navigator === 'undefined' ? null : toLanguageCode(navigator.language);
  const fallback: LanguageCode = browser && browser !== bookLanguage ? browser : bookLanguage === 'es' ? 'en' : 'es';
  return {
    from: toLanguageCode(book.translate_from) ?? AUTO_DETECT,
    to: toLanguageCode(book.translate_to) ?? fallback,
  };
}

/** What a translation or a card is made from: a live selection or a saved highlight. */
function sourceFromSelection(selection: TextSelection, chapter: string | null): CardDraftSource {
  return {
    quote: selection.text.slice(0, 5000),
    context: selection.context,
    chapterLabel: chapter,
    annotationId: null,
    selection: { cfi_range: selection.cfiRange, quote: selection.text.slice(0, 5000), chapter_label: chapter, color: 'yellow' },
    translation: null,
  };
}

function sourceFromAnnotation(annotation: BookAnnotation): CardDraftSource {
  return {
    quote: annotation.quote,
    context: null,
    chapterLabel: annotation.chapter_label,
    annotationId: annotation.id,
    selection: null,
    translation: null,
  };
}

export function Reader({
  book,
  initialAnnotations,
  initialPreferences,
  initialDeckOptions,
  startCfi,
}: ReaderProps): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [tokens, setTokens] = useState<ReaderTokens | null>(null);
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin));
  const [location, setLocation] = useState<ReaderLocation | null>(null);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<{ id: string; rect: ViewportRect } | null>(null);
  const [noteTarget, setNoteTarget] = useState<BookAnnotation | null>(null);
  const [translateSource, setTranslateSource] = useState<CardDraftSource | null>(null);
  const [cardDraft, setCardDraft] = useState<CardDraftSource | null>(null);
  const [deckOptions, setDeckOptions] = useState(initialDeckOptions);
  const [translatePair] = useState(() => initialTranslatePair(book));

  // ── Theme: <html data-reader-theme> re-points tokens for the whole page
  // (including portalled sheets) while the reader is mounted.
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'auto') delete root.dataset.readerTheme;
    else root.dataset.readerTheme = preferences.theme;
    // Read the resolved tokens once the attribute has been applied.
    // (A timeout, not rAF: rAF is paused in background tabs.)
    const timer = window.setTimeout(() => setTokens(readReaderTokens()), 0);
    return () => window.clearTimeout(timer);
  }, [preferences.theme, resolvedTheme]);

  useEffect(() => () => void delete document.documentElement.dataset.readerTheme, []);

  // Mobile browsers tint their own bars with theme-color: match the page so the
  // only thing around the text is the reader background (pure black in Dark).
  useEffect(() => {
    if (!tokens) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    const previous = meta.content;
    meta.content = tokens.background;
    const tag = meta;
    return () => {
      if (created) tag.remove();
      else tag.content = previous;
    };
  }, [tokens]);

  const css = useMemo(
    () => (tokens ? buildReaderCss(tokens, preferences, origin) : ''),
    [tokens, preferences, origin]
  );

  // ── Persistence (debounced) ─────────────────────────────────────────────
  const progressTimer = useRef<number | undefined>(undefined);
  const prefsTimer = useRef<number | undefined>(undefined);

  const handleRelocated = useCallback(
    (next: ReaderLocation) => {
      setLocation(next);
      setActiveHighlight(null);
      window.clearTimeout(progressTimer.current);
      progressTimer.current = window.setTimeout(() => {
        void saveReadingProgressAction({ book_id: book.id, cfi: next.cfi, progress: next.progress });
      }, PROGRESS_DEBOUNCE_MS);
    },
    [book.id]
  );

  const handlePreferences = useCallback((next: ReaderPreferences) => {
    setPreferences(next);
    window.clearTimeout(prefsTimer.current);
    prefsTimer.current = window.setTimeout(() => {
      void updateReaderPreferencesAction(next);
    }, PREFS_DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(progressTimer.current);
      window.clearTimeout(prefsTimer.current);
    },
    []
  );

  const handleSelect = useCallback((next: TextSelection | null) => {
    setSelection(next);
    if (next) setActiveHighlight(null);
  }, []);

  const handleHighlightClick = useCallback((id: string, rect: ViewportRect) => {
    setSelection(null);
    setActiveHighlight({ id, rect });
  }, []);

  const toggleChrome = useCallback(() => setChromeVisible((visible) => !visible), []);

  // ── Fullscreen: entering it hides the chrome (tap the centre to bring it back).
  const fullscreen = useFullscreen(useCallback((active: boolean) => setChromeVisible(!active), []));
  const { support: fullscreenSupport, toggle: toggleFullscreenApi } = fullscreen;
  const toggleFullscreen = useCallback(() => {
    if (fullscreenSupport === 'api') toggleFullscreenApi();
    else if (fullscreenSupport === 'install') {
      toast.info('Full screen on iPhone', {
        description: 'Tap Share → Add to Home Screen, then open NeuroCards from the icon to read without browser bars.',
        duration: 8000,
      });
    }
  }, [fullscreenSupport, toggleFullscreenApi]);

  const handleLocationsGenerated = useCallback(
    (json: string) => {
      void saveBookLocationsAction({ book_id: book.id, locations_json: json });
    },
    [book.id]
  );

  const reader = useEpubReader({
    bookId: book.id,
    initialCfi: startCfi ?? book.last_cfi,
    locationsJson: book.locations_json,
    language: book.language,
    css,
    container: css ? container : null, // wait for tokens so the first page is styled
    onRelocated: handleRelocated,
    onSelect: handleSelect,
    onHighlightClick: handleHighlightClick,
    onToggleChrome: toggleChrome,
    onToggleFullscreen: toggleFullscreen,
    onLocationsGenerated: handleLocationsGenerated,
  });

  const { status, renderHighlights } = reader;
  useEffect(() => {
    if (status === 'ready' && tokens) renderHighlights(annotations, tokens);
  }, [status, tokens, annotations, renderHighlights]);

  // ── Annotation actions ──────────────────────────────────────────────────
  const createHighlight = async (color: HighlightColor): Promise<BookAnnotation | null> => {
    if (!selection) return null;
    const result = await createAnnotationAction({
      book_id: book.id,
      cfi_range: selection.cfiRange,
      quote: selection.text.slice(0, 5000),
      chapter_label: location?.chapter ?? null,
      color,
    });
    reader.clearSelection();
    setSelection(null);
    if (!result.data) {
      toast.error(result.error?.message ?? 'Could not save highlight');
      return null;
    }
    const created = result.data;
    setAnnotations((current) => [...current, created]);
    return created;
  };

  const patchAnnotation = async (id: string, patch: { color?: HighlightColor; note?: string | null }): Promise<void> => {
    const result = await updateAnnotationAction(id, patch);
    if (!result.data) {
      toast.error(result.error?.message ?? 'Could not update highlight');
      return;
    }
    const updated = result.data;
    setAnnotations((current) => current.map((item) => (item.id === id ? updated : item)));
  };

  const removeAnnotation = async (id: string): Promise<void> => {
    const previous = annotations;
    setAnnotations((current) => current.filter((item) => item.id !== id));
    setActiveHighlight(null);
    const result = await deleteAnnotationAction(id);
    if (result.error) {
      setAnnotations(previous);
      toast.error(result.error.message);
    }
  };

  const copyText = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
    reader.clearSelection();
    setSelection(null);
    setActiveHighlight(null);
  };

  const dismissSelection = (): void => {
    reader.clearSelection();
    setSelection(null);
    setActiveHighlight(null);
  };

  const openTranslate = (source: CardDraftSource): void => {
    dismissSelection();
    setTranslateSource(source);
    setPanel('translate');
  };

  const openCard = (source: CardDraftSource): void => {
    dismissSelection();
    setCardDraft(source);
  };

  const handleCardCreated = (created: CreatedBookCard): void => {
    const { annotation, deck } = created;
    if (annotation) setAnnotations((current) => [...current, annotation]);
    setDeckOptions((current) => ({
      decks: current.decks.some((item) => item.id === deck.id)
        ? current.decks
        : [...current.decks, deck].sort((a, b) => a.name.localeCompare(b.name)),
      default_deck_id: deck.id,
    }));
    toast.success(`Card added to ${deck.name}`);
  };

  const active = activeHighlight ? annotations.find((item) => item.id === activeHighlight.id) ?? null : null;

  const navigate = (target: string): void => {
    reader.display(target);
    setPanel(null);
  };

  const pageLabel =
    location?.page && location.totalPages
      ? `${location.page} of ${location.totalPages}`
      : location
        ? `${Math.round(location.progress * 100)}%`
        : '';

  const showFullscreenButton = fullscreen.support === 'api' || fullscreen.support === 'install';
  const pillGroup = 'flex items-center gap-0.5 rounded-full bg-card p-1 shadow-ambient';
  const pillButton = 'size-11 rounded-full sm:size-9';

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-on-surface">
      {/* Top bar — hidden (but still occupying space) in clean reading mode so the
          page never re-paginates when chrome toggles. */}
      <header
        className={cn(
          'grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 transition-opacity duration-200 sm:px-5',
          chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className={cn(pillGroup, 'justify-self-start')}>
          <Button
            variant="ghost"
            size="icon"
            className={pillButton}
            aria-label="Back to library"
            nativeButton={false}
            render={<Link href="/library" />}
          >
            <ArrowLeft />
          </Button>
          <Button variant="ghost" size="icon" className={pillButton} aria-label="Contents" onClick={() => setPanel('toc')}>
            <List />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={pillButton}
            aria-label="Highlights and notes"
            onClick={() => setPanel('notes')}
          >
            <Highlighter />
          </Button>
        </div>
        {/* Six 44 px pills leave no room for the title on a phone. */}
        <div className={cn('min-w-0 max-w-[40vw] text-center sm:max-w-md', showFullscreenButton && 'max-sm:invisible max-sm:w-0')}>
          <p className="truncate text-body-sm font-semibold text-on-surface">{book.title}</p>
          {location?.chapter && (
            <p className="hidden truncate text-body-sm text-on-surface-variant sm:block">{location.chapter}</p>
          )}
        </div>
        <div className={cn(pillGroup, 'justify-self-end')}>
          <Button
            variant="ghost"
            size="icon"
            className={pillButton}
            aria-label="Ask this book"
            onClick={() => setPanel('ask')}
          >
            <MessageCircleQuestion />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={pillButton}
            aria-label="Reading settings"
            onClick={() => setPanel('settings')}
          >
            <ALargeSmall />
          </Button>
          {showFullscreenButton && (
            <Button
              variant="ghost"
              size="icon"
              className={pillButton}
              aria-label={fullscreen.active ? 'Exit full screen' : 'Full screen'}
              aria-pressed={fullscreen.active}
              onClick={toggleFullscreen}
            >
              {fullscreen.active ? <Minimize /> : <Maximize />}
            </Button>
          )}
        </div>
      </header>

      {/* Page */}
      <main className="relative flex min-h-0 flex-1 items-stretch">
        <button
          type="button"
          aria-label="Previous page"
          onClick={reader.prev}
          disabled={location?.atStart}
          className="hidden w-16 shrink-0 items-center justify-center text-on-surface-variant opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:invisible lg:flex"
        >
          <ChevronLeft className="size-6" />
        </button>
        {/* Clicks on the side gutters (outside the iframe) still turn pages —
            that's exactly where a thumb taps on a phone. */}
        <div
          className="relative min-w-0 flex-1 px-6 py-2 sm:px-12 lg:px-4"
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const ratio = (event.clientX - bounds.left) / bounds.width;
            if (ratio < 0.25) reader.prev();
            else if (ratio > 0.75) reader.next();
          }}
        >
          <div ref={setContainer} className={cn('h-full w-full', status !== 'ready' && 'invisible')} />
          {status !== 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-body-md text-on-surface-variant">
                {status === 'error' ? 'This book could not be opened.' : 'Opening book…'}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Next page"
          onClick={reader.next}
          disabled={location?.atEnd}
          className="hidden w-16 shrink-0 items-center justify-center text-on-surface-variant opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:invisible lg:flex"
        >
          <ChevronRight className="size-6" />
        </button>
      </main>

      {/* Footer — page position, like Apple Books */}
      <footer className="flex h-12 shrink-0 flex-col items-center justify-center gap-1.5 px-4">
        <p className="text-body-sm tabular text-on-surface-variant" aria-live="polite">
          {pageLabel}
        </p>
        <MasteryThread
          value={Math.round((location?.progress ?? 0) * 100)}
          tone="primary"
          animate={false}
          className={cn('w-24 transition-opacity', chromeVisible ? 'opacity-100' : 'opacity-0')}
        />
      </footer>

      {selection && (
        <SelectionToolbar
          rect={selection.rect}
          onColor={(color) => void createHighlight(color)}
          onTranslate={() => openTranslate(sourceFromSelection(selection, location?.chapter ?? null))}
          onCard={() => openCard(sourceFromSelection(selection, location?.chapter ?? null))}
          onNote={async () => {
            const created = await createHighlight('yellow');
            if (created) setNoteTarget(created);
          }}
          onCopy={() => void copyText(selection.text)}
        />
      )}

      {active && activeHighlight && (
        <SelectionToolbar
          rect={activeHighlight.rect}
          activeColor={active.color}
          onColor={(color) => {
            setActiveHighlight(null);
            void patchAnnotation(active.id, { color });
          }}
          onTranslate={() => openTranslate(sourceFromAnnotation(active))}
          onCard={() => openCard(sourceFromAnnotation(active))}
          onNote={() => {
            setActiveHighlight(null);
            setNoteTarget(active);
          }}
          onCopy={() => void copyText(active.quote)}
          onDelete={() => void removeAnnotation(active.id)}
        />
      )}

      {noteTarget && (
        <AnnotationNoteDialog
          quote={noteTarget.quote}
          initialNote={noteTarget.note}
          onSave={(note) => patchAnnotation(noteTarget.id, { note: note || null })}
          onClose={() => setNoteTarget(null)}
        />
      )}

      {cardDraft && (
        <CreateCardDialog
          bookId={book.id}
          bookTitle={book.title}
          source={cardDraft}
          deckOptions={deckOptions}
          onCreated={handleCardCreated}
          onClose={() => setCardDraft(null)}
        />
      )}

      <TranslateSheet
        open={panel === 'translate'}
        onOpenChange={(open) => setPanel(open ? 'translate' : null)}
        bookId={book.id}
        passage={translateSource ? { text: translateSource.quote, context: translateSource.context } : null}
        initialPair={translatePair}
        onCreateCard={(translation) => {
          if (!translateSource) return;
          setPanel(null);
          setCardDraft({ ...translateSource, translation });
        }}
      />

      <AskSheet
        open={panel === 'ask'}
        onOpenChange={(open) => setPanel(open ? 'ask' : null)}
        bookId={book.id}
        positionHref={location?.href ?? null}
        onOpenSource={(source) => {
          setPanel(null);
          void reader.goToPassage(source.href, source.locator);
        }}
      />

      <TocSheet
        open={panel === 'toc'}
        onOpenChange={(open) => setPanel(open ? 'toc' : null)}
        toc={reader.toc}
        currentChapter={location?.chapter ?? null}
        onNavigate={navigate}
      />
      <AnnotationsSheet
        open={panel === 'notes'}
        onOpenChange={(open) => setPanel(open ? 'notes' : null)}
        annotations={annotations}
        onNavigate={navigate}
        onEditNote={(annotation) => {
          setPanel(null);
          setNoteTarget(annotation);
        }}
        onDelete={(annotation) => void removeAnnotation(annotation.id)}
      />
      <ReaderSettingsSheet
        open={panel === 'settings'}
        onOpenChange={(open) => setPanel(open ? 'settings' : null)}
        preferences={preferences}
        onChange={handlePreferences}
      />
    </div>
  );
}
