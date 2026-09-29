'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlignJustify, AlignLeft, Minus, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ReaderPreferences } from '@/lib/services/reader-preferences-service';
import { ReaderPreferencesSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FilterChip } from '@/components/primitives/filter-chip';

const FormSchema = ReaderPreferencesSchema.required();

const THEMES: Array<{ value: ReaderPreferences['theme']; label: string; swatch: string }> = [
  { value: 'sepia', label: 'Sepia', swatch: 'bg-reader-sepia-surface text-reader-sepia-on-surface' },
  { value: 'light', label: 'Light', swatch: 'bg-reader-swatch-light text-reader-swatch-on-light' },
  { value: 'dark', label: 'Dark', swatch: 'bg-reader-swatch-dark text-reader-swatch-on-dark' },
  { value: 'auto', label: 'Auto', swatch: 'bg-surface-container text-on-surface' },
];

const FONTS: Array<{ value: ReaderPreferences['font_family']; label: string; sample: string }> = [
  { value: 'book', label: 'Book', sample: 'font-reader' },
  { value: 'sans', label: 'Sans', sample: 'font-sans' },
  { value: 'original', label: 'Original', sample: 'font-sans italic' },
];

const LINE_HEIGHTS: Array<{ value: number; label: string }> = [
  { value: 1.35, label: 'Compact' },
  { value: 1.55, label: 'Normal' },
  { value: 1.8, label: 'Relaxed' },
];

const SCALE_STEP = 0.1;
const SCALE_MIN = 0.8;
const SCALE_MAX = 1.6;

interface ReaderSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: ReaderPreferences;
  onChange: (preferences: ReaderPreferences) => void;
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
}: ReaderSettingsSheetProps): React.JSX.Element {
  const { control, setValue, getValues } = useForm<ReaderPreferences>({
    resolver: zodResolver(FormSchema),
    defaultValues: preferences,
  });
  const values = useWatch({ control });

  // Every change applies live; the parent persists it (debounced).
  const commit = (): void => {
    const parsed = FormSchema.safeParse(getValues());
    if (parsed.success) onChange(parsed.data);
  };

  const scale = Math.round((values.font_scale ?? 1) * 10) / 10;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full shadow-ambient-lg sm:max-w-sm">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-headline-sm">Reading settings</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-8 overflow-y-auto px-5 pb-8">
          <Section title="Theme">
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  aria-pressed={values.theme === theme.value}
                  onClick={() => { setValue('theme', theme.value, { shouldDirty: true }); commit(); }}
                  className="flex flex-col items-center gap-1.5"
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
                </button>
              ))}
            </div>
          </Section>

          <Section title="Font">
            <div className="grid grid-cols-3 gap-2">
              {FONTS.map((font) => (
                <button
                  key={font.value}
                  type="button"
                  aria-pressed={values.font_family === font.value}
                  onClick={() => { setValue('font_family', font.value, { shouldDirty: true }); commit(); }}
                  className={cn(
                    'flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-container-low transition-colors hover:bg-surface-container',
                    values.font_family === font.value && 'bg-primary/10 text-primary'
                  )}
                >
                  <span className={cn('text-headline-sm font-normal', font.sample)}>Aa</span>
                  <span className="text-label-sm uppercase">{font.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Text size">
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-2">
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Smaller text"
                disabled={scale <= SCALE_MIN}
                onClick={() => { setValue('font_scale', Math.max(SCALE_MIN, scale - SCALE_STEP), { shouldDirty: true }); commit(); }}
              >
                <Minus />
              </Button>
              <span className="text-metric-sm tabular text-on-surface">{Math.round(scale * 100)}%</span>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Larger text"
                disabled={scale >= SCALE_MAX}
                onClick={() => { setValue('font_scale', Math.min(SCALE_MAX, scale + SCALE_STEP), { shouldDirty: true }); commit(); }}
              >
                <Plus />
              </Button>
            </div>
          </Section>

          <Section title="Line spacing">
            <div className="flex flex-wrap gap-2">
              {LINE_HEIGHTS.map((option) => (
                <FilterChip
                  key={option.value}
                  active={values.line_height === option.value}
                  onClick={() => { setValue('line_height', option.value, { shouldDirty: true }); commit(); }}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>
          </Section>

          <Section title="Alignment">
            <div className="flex flex-wrap gap-2">
              <FilterChip active={!values.justify} onClick={() => { setValue('justify', false, { shouldDirty: true }); commit(); }}>
                <AlignLeft />
                Left
              </FilterChip>
              <FilterChip active={values.justify === true} onClick={() => { setValue('justify', true, { shouldDirty: true }); commit(); }}>
                <AlignJustify />
                Justified
              </FilterChip>
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
