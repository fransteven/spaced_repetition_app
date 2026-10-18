import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ReaderPreferencesSchema } from '@/lib/validations';
import { DEFAULT_READER_PREFERENCES, READER_PRESETS, READER_THEMES, READER_FONTS, isDarkReaderTheme, matchesReaderPreset } from '@/lib/reader-options';
import { readerFontFaces } from '@/lib/reader-fonts';
import { buildReaderCss, type ReaderTokens } from '@/components/reader/reader-theme';

const tokens: ReaderTokens = {
  background: 'rgb(250, 246, 237)', foreground: 'rgb(50, 45, 37)',
  link: 'rgb(53, 37, 205)', selection: 'rgb(140, 195, 255)',
  highlight: { yellow: 'yellow', green: 'green', blue: 'blue', pink: 'pink' },
  highlightOpacity: '0.5', dark: false,
};

describe('reader preferences and iframe styling', () => {
  it('accepts every theme, font and complete preset while preserving defaults', () => {
    for (const theme of READER_THEMES) expect(ReaderPreferencesSchema.safeParse({ theme: theme.value }).success).toBe(true);
    for (const font of READER_FONTS) expect(ReaderPreferencesSchema.safeParse({ font_family: font.value }).success).toBe(true);
    for (const preset of READER_PRESETS) expect(ReaderPreferencesSchema.required().safeParse(preset.preferences).success).toBe(true);
    expect(DEFAULT_READER_PREFERENCES).toEqual({ font_scale: 1, font_family: 'book', line_height: 1.45, justify: false, two_pages: false, theme: 'sepia' });
    expect(ReaderPreferencesSchema.safeParse({ theme: 'invalid' }).success).toBe(false);
    expect(ReaderPreferencesSchema.safeParse({ font_family: 'invalid' }).success).toBe(false);
    for (const scale of [0.6, 1.7, NaN, Infinity]) expect(ReaderPreferencesSchema.safeParse({ font_scale: scale }).success).toBe(false);
  });

  it('only marks a preset active when all settings match (including PostgreSQL real precision)', () => {
    const rest = READER_PRESETS.find((preset) => preset.id === 'rest');
    if (!rest) throw new Error('Rest preset missing');
    expect(matchesReaderPreset({ ...rest.preferences, font_scale: 1.100000023841858 }, rest.preferences)).toBe(true);
    expect(matchesReaderPreset({ ...rest.preferences, justify: true }, rest.preferences)).toBe(false);
    expect(matchesReaderPreset({ ...rest.preferences, two_pages: true }, rest.preferences)).toBe(false);
    expect(matchesReaderPreset({ ...rest.preferences, font_scale: 1.2 }, rest.preferences)).toBe(false);
  });

  it('resolves explicit themes independently of the app', () => {
    for (const appDark of [true, false]) {
      for (const theme of ['dark', 'slate']) expect(isDarkReaderTheme(theme, appDark)).toBe(true);
      for (const theme of ['light', 'sepia', 'paper', 'sage']) expect(isDarkReaderTheme(theme, appDark)).toBe(false);
      expect(isDarkReaderTheme(undefined, appDark)).toBe(appDark);
      expect(isDarkReaderTheme('auto', appDark)).toBe(appDark);
    }
  });

  it('ships every referenced face locally with valid WOFF2 sources and font licenses', () => {
    for (const font of READER_FONTS) {
      const css = readerFontFaces(font.value, 'https://example.test');
      expect(css).not.toContain(',;');
      for (const match of css.matchAll(/url\(https:\/\/example.test([^)]*)\)/g)) {
        const asset = path.join(process.cwd(), 'public', match[1]);
        expect(fs.existsSync(asset), asset).toBe(true);
        expect(fs.readFileSync(asset).subarray(0, 4).toString()).toBe('wOF2');
        expect(fs.existsSync(path.join(path.dirname(asset), 'LICENSE'))).toBe(true);
      }
      if (font.value !== 'original') {
        expect(css).toContain('font-style: italic');
        expect(css).toContain('U+0100-02BA');
      }
    }
  });

  it('keeps publisher colours in light themes and code monospace with custom fonts', () => {
    const css = buildReaderCss(tokens, { ...DEFAULT_READER_PREFERENCES, font_family: 'source' }, 'https://example.test');
    expect(css).toContain('"Source Serif 4"');
    expect(css).toContain('body pre, body pre *');
    expect(css).not.toContain('filter: invert');
    expect(buildReaderCss({ ...tokens, dark: true }, DEFAULT_READER_PREFERENCES, 'https://example.test')).toContain('filter: invert');
    const original = buildReaderCss(tokens, { ...DEFAULT_READER_PREFERENCES, font_family: 'original' }, 'https://example.test');
    expect(original).not.toContain('font-family:');
  });
});
