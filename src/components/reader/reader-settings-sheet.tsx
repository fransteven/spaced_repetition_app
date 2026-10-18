'use client';

import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlignJustify, AlignLeft, BookOpen, Minus, Plus, RectangleVertical, RotateCcw, Check, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PreferenceSaveStatus } from '@/components/reader/preference-saver';
import type { ReaderPreferences } from '@/lib/services/reader-preferences-service';
import { ReaderPreferencesSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { FilterChip } from '@/components/primitives/filter-chip';

import {
  DEFAULT_READER_PREFERENCES,
  READER_THEMES,
  READER_FONTS,
  READER_PRESETS,
  READER_LINE_HEIGHTS,
  READER_SCALE_MIN,
  READER_SCALE_MAX,
  READER_SCALE_STEP,
  matchesReaderPreset,
} from '@/lib/reader-options';

const FormSchema = ReaderPreferencesSchema.required();
type FormValues = z.infer<typeof FormSchema>;

interface ReaderSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: ReaderPreferences;
  onChange: (preferences: ReaderPreferences) => void;
  previewCss: string;
  saveStatus: PreferenceSaveStatus;
  onRetry: () => void;
  onStartReading: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="space-y-3">
      <h3 className="text-label-md uppercase text-on-surface-variant">{title}</h3>
      {children}
    </section>
  );
}

export function ReaderSettingsSheet({
  open,
  onOpenChange,
  preferences,
  onChange,
  previewCss,
  saveStatus,
  onRetry,
  onStartReading,
}: ReaderSettingsSheetProps): React.JSX.Element {
  const { control, setValue, getValues, reset } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: preferences,
    values: preferences,
  });
  const values = useWatch({ control });

  // Every change applies live; the parent persists it (debounced).
  const commit = (): void => {
    const parsed = FormSchema.safeParse(getValues());
    if (parsed.success) onChange(parsed.data);
  };

  const apply = (next: ReaderPreferences): void => {
    reset(next);
    onChange(next);
  };
  const activePreset = READER_PRESETS.find((preset) => matchesReaderPreset(preferences, preset.preferences));
  const font = READER_FONTS.find((option) => option.value === preferences.font_family);
  const theme = READER_THEMES.find((option) => option.value === preferences.theme);
  // Keep the sample short enough for the largest text size; iframe-only layout centres it.
  const preview = `<!doctype html><html lang="en"><head><style>${previewCss}
html{padding:0!important}body{margin:0;min-height:100vh;display:grid;align-content:center}</style></head><body><p style="margin:0">A quiet page, <em>another world.</em></p></body></html>`;

  const scale = Math.round((values.font_scale ?? 1) * 10) / 10;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-0 shadow-ambient-lg data-[side=right]:w-full data-[side=right]:sm:max-w-md [&_[data-slot=sheet-close]]:size-11">
        <SheetHeader className="shrink-0 px-5 pt-6 pr-12">
          <p className="mb-2 text-label-md uppercase text-on-surface-variant">Your reading room</p>
          <SheetTitle className="text-headline-sm">Reading settings</SheetTitle>
          <SheetDescription className="mt-1 text-body-sm">Find a page that feels like yours.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 pb-5">
          <Section title="Start with a mood">
            <div className="space-y-2">
              {READER_PRESETS.map((preset) => (
                <Button key={preset.id} variant="ghost" aria-label={`${preset.label} preset`}
                  aria-pressed={activePreset?.id === preset.id} onClick={() => apply(preset.preferences)}
                  className={cn('h-auto min-h-14 w-full justify-between rounded-xl bg-surface-container-low px-4 py-3 text-left', activePreset?.id === preset.id && 'bg-primary/10 text-primary')}>
                  <span className="min-w-0 whitespace-normal">
                    <span className="block text-body-md font-semibold">{preset.label}</span>
                    <span className="block text-body-sm font-normal text-on-surface-variant">{preset.description}</span>
                  </span>
                  {activePreset?.id === preset.id && <Check aria-hidden="true" />}
                </Button>
              ))}
            </div>
          </Section>
          <section aria-label="Reading preview" className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-body-sm text-on-surface-variant">
              <span>Live preview</span><span>{theme?.label} · {font?.label}</span>
            </div>
            <iframe title="Reading preview" sandbox="allow-same-origin" tabIndex={-1} srcDoc={preview}
              className="pointer-events-none h-40 w-full rounded-xl border-0 bg-background p-4 shadow-ambient" />
            {preferences.font_family === 'original' && <p className="text-body-sm text-on-surface-variant">The publisher’s font appears in the book.</p>}
          </section>
          <Section title="Theme">
            <div className="grid grid-cols-4 gap-2">
              {READER_THEMES.map((theme) => (
                <Button
                  variant="ghost"
                  key={theme.value}
                  type="button"
                  aria-label={`${theme.label} theme`}
                  title={theme.description}
                  aria-pressed={values.theme === theme.value}
                  onClick={() => { setValue('theme', theme.value, { shouldDirty: true }); commit(); }}
                  className="h-auto min-h-20 flex-col gap-2 rounded-xl px-1 py-2"
                >
                  <span
                    className={cn(
                      'flex size-12 items-center justify-center rounded-full text-body-md font-semibold shadow-ambient transition-transform',
                      theme.swatch,
                      values.theme === theme.value && 'outline-2 outline-offset-2 outline-primary'
                    )}
                  >
                    Aa
                  </span>
                  <span className="text-label-sm uppercase text-on-surface-variant">{theme.label}</span>
                </Button>
              ))}
            </div>
          </Section>

          <Section title="Font">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {READER_FONTS.map((font) => (
                <Button
                  variant="ghost"
                  key={font.value}
                  type="button"
                  aria-label={`${font.label} font`}
                  title={font.description}
                  aria-pressed={values.font_family === font.value}
                  onClick={() => { setValue('font_family', font.value, { shouldDirty: true }); commit(); }}
                  className={cn(
                    'flex h-20 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-container-low transition-colors hover:bg-surface-container',
                    values.font_family === font.value && 'bg-primary/10 text-primary'
                  )}
                >
                  <span className={cn('text-headline-md font-normal', font.sample)}>Aa</span>
                  <span className="text-label-sm uppercase">{font.label}</span>
                </Button>
              ))}
            </div>
          </Section>

          <Section title="Text size">
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-2">
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-11"
                aria-label="Smaller text"
                disabled={scale <= READER_SCALE_MIN}
                onClick={() => { setValue('font_scale', Math.max(READER_SCALE_MIN, scale - READER_SCALE_STEP), { shouldDirty: true }); commit(); }}
              >
                <Minus />
              </Button>
              <span className="text-metric-sm tabular text-on-surface">{Math.round(scale * 100)}%</span>
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-11"
                aria-label="Larger text"
                disabled={scale >= READER_SCALE_MAX}
                onClick={() => { setValue('font_scale', Math.min(READER_SCALE_MAX, scale + READER_SCALE_STEP), { shouldDirty: true }); commit(); }}
              >
                <Plus />
              </Button>
            </div>
          </Section>

          <Section title="Line spacing">
            <div className="flex flex-wrap gap-2">
              {READER_LINE_HEIGHTS.map((option) => (
                <FilterChip
                  key={option.value}
                  className="min-h-11 px-4"
                  active={Math.abs((values.line_height ?? preferences.line_height) - option.value) < 0.001}
                  aria-pressed={Math.abs((values.line_height ?? preferences.line_height) - option.value) < 0.001}
                  onClick={() => { setValue('line_height', option.value, { shouldDirty: true }); commit(); }}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>
          </Section>

          <Section title="Alignment">
            <div className="flex flex-wrap gap-2">
              <FilterChip className="min-h-11 px-4" active={!values.justify} aria-pressed={!values.justify} onClick={() => { setValue('justify', false, { shouldDirty: true }); commit(); }}>
                <AlignLeft />
                Left
              </FilterChip>
              <FilterChip className="min-h-11 px-4" active={values.justify === true} aria-pressed={values.justify === true} onClick={() => { setValue('justify', true, { shouldDirty: true }); commit(); }}>
                <AlignJustify />
                Justified
              </FilterChip>
            </div>
          </Section>

          <Section title="Layout">
            <div className="flex flex-wrap gap-2">
              <FilterChip className="min-h-11 px-4" active={!values.two_pages} aria-pressed={!values.two_pages} onClick={() => { setValue('two_pages', false, { shouldDirty: true }); commit(); }}>
                <RectangleVertical />
                One page
              </FilterChip>
              <FilterChip className="min-h-11 px-4" active={values.two_pages === true} aria-pressed={values.two_pages === true} onClick={() => { setValue('two_pages', true, { shouldDirty: true }); commit(); }}>
                <BookOpen />
                Two pages
              </FilterChip>
            </div>
            <p className="text-body-sm text-on-surface-variant">Two pages side by side on wide screens only.</p>
          </Section>
        </div>
        <div className="shrink-0 space-y-3 bg-surface-container-low px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <p role="status" className="text-body-sm text-on-surface-variant">
              {saveStatus === 'saving' ? 'Saving your preferences…'
                : saveStatus === 'error' ? 'Could not save preferences.'
                  : 'Preferences synced across devices'}
            </p>
            {saveStatus === 'error' && <Button variant="ghost" className="min-h-11" onClick={onRetry}>Retry</Button>}
          </div>
          <Button className="w-full" size="xl" onClick={onStartReading}>Start reading <ArrowRight aria-hidden="true" /></Button>
          <Button variant="ghost" className="min-h-11 w-full text-on-surface-variant" onClick={() => apply(DEFAULT_READER_PREFERENCES)}><RotateCcw aria-hidden="true" /> Reset settings</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
