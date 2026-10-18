import type { ReaderPreferences } from '@/lib/services/reader-preferences-service';

// Ordered tuples are shared by PostgreSQL enums and Zod; old values stay in place.
export const READER_THEME_VALUES: ['auto', 'light', 'dark', 'sepia', 'paper', 'sage', 'slate'] =
  ['auto', 'light', 'dark', 'sepia', 'paper', 'sage', 'slate'];
export const READER_FONT_VALUES: ['book', 'sans', 'original', 'literata', 'source', 'atkinson'] =
  ['book', 'sans', 'original', 'literata', 'source', 'atkinson'];

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  font_scale: 1, font_family: 'book', line_height: 1.45,
  justify: false, two_pages: false, theme: 'sepia',
};

export const READER_THEMES: ReadonlyArray<{
  value: ReaderPreferences['theme']; label: string; description: string; swatch: string;
}> = [
  { value: 'sepia', label: 'Sepia', description: 'Warm parchment', swatch: 'bg-reader-sepia-surface text-reader-sepia-on-surface' },
  { value: 'paper', label: 'Paper', description: 'Soft ivory', swatch: 'bg-reader-paper-surface text-reader-paper-on-surface' },
  { value: 'sage', label: 'Sage', description: 'Quiet green', swatch: 'bg-reader-sage-surface text-reader-sage-on-surface' },
  { value: 'light', label: 'Light', description: 'Pure white', swatch: 'bg-reader-swatch-light text-reader-swatch-on-light' },
  { value: 'slate', label: 'Slate', description: 'Gentle evening', swatch: 'bg-reader-slate-surface text-reader-slate-on-surface' },
  { value: 'dark', label: 'Dark', description: 'True black', swatch: 'bg-reader-swatch-dark text-reader-swatch-on-dark' },
  { value: 'auto', label: 'Auto', description: 'Follow app theme', swatch: 'bg-surface-container text-on-surface' },
];

export const READER_FONTS: ReadonlyArray<{
  value: ReaderPreferences['font_family']; label: string; description: string; sample: string;
}> = [
  { value: 'book', label: 'Book', description: 'A familiar book face', sample: 'font-reader' },
  { value: 'literata', label: 'Literata', description: 'Made for long reading', sample: 'font-reader-literata' },
  { value: 'source', label: 'Source Serif', description: 'An editorial classic', sample: 'font-reader-source' },
  { value: 'atkinson', label: 'Atkinson', description: 'Distinct, open letters', sample: 'font-reader-atkinson' },
  { value: 'sans', label: 'Sans', description: 'Clean and contemporary', sample: 'font-reader-sans' },
  { value: 'original', label: 'Original', description: 'As the publisher intended', sample: 'font-serif italic' },
];

export const READER_PRESETS: ReadonlyArray<{
  id: string; label: string; description: string; preferences: ReaderPreferences;
}> = [
  { id: 'editorial', label: 'Editorial', description: 'Warm paper, classic type', preferences: {
    ...DEFAULT_READER_PREFERENCES, font_family: 'literata',
  } },
  { id: 'rest', label: 'Rest', description: 'Open letters, room to breathe', preferences: {
    ...DEFAULT_READER_PREFERENCES, theme: 'paper', font_family: 'atkinson', font_scale: 1.1, line_height: 1.8,
  } },
  { id: 'night', label: 'Night', description: 'A softer page after dark', preferences: {
    ...DEFAULT_READER_PREFERENCES, theme: 'slate', font_family: 'literata', line_height: 1.6,
  } },
];

export const READER_LINE_HEIGHTS = [
  { value: 1.35, label: 'Compact' }, { value: 1.45, label: 'Normal' },
  { value: 1.6, label: 'Comfort' }, { value: 1.8, label: 'Relaxed' },
];
export const READER_SCALE_MIN = 0.7;
export const READER_SCALE_MAX = 1.6;
export const READER_SCALE_STEP = 0.1;

export function matchesReaderPreset(current: ReaderPreferences, preset: ReaderPreferences): boolean {
  return current.theme === preset.theme && current.font_family === preset.font_family &&
    Math.abs(current.font_scale - preset.font_scale) < 0.001 &&
    Math.abs(current.line_height - preset.line_height) < 0.001 &&
    current.justify === preset.justify && current.two_pages === preset.two_pages;
}

export function isDarkReaderTheme(theme: string | undefined, appDark: boolean): boolean {
  return !theme || theme === 'auto' ? appDark : theme === 'dark' || theme === 'slate';
}
