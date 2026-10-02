/** Languages offered by the reader's translator (ISO 639-1 codes). */
export const LANGUAGE_CODES = [
  'en', 'es', 'pt', 'fr', 'de', 'it', 'nl', 'ca', 'sv', 'pl', 'uk', 'ru',
  'el', 'tr', 'ar', 'he', 'hi', 'zh', 'ja', 'ko', 'id', 'vi', 'la',
] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

const LABELS: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  nl: 'Dutch',
  ca: 'Catalan',
  sv: 'Swedish',
  pl: 'Polish',
  uk: 'Ukrainian',
  ru: 'Russian',
  el: 'Greek',
  tr: 'Turkish',
  ar: 'Arabic',
  he: 'Hebrew',
  hi: 'Hindi',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  id: 'Indonesian',
  vi: 'Vietnamese',
  la: 'Latin',
};

export const AUTO_DETECT = 'auto';

export const TRANSLATION_LANGUAGES: Array<{ code: LanguageCode; label: string }> = LANGUAGE_CODES.map(
  (code) => ({ code, label: LABELS[code] })
);

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return LANGUAGE_CODES.some((code) => code === value);
}

/** 'en-US' / 'EN' → 'en' when supported, otherwise null. */
export function toLanguageCode(value: string | null | undefined): LanguageCode | null {
  const base = value?.trim().toLowerCase().split(/[-_]/)[0];
  return isLanguageCode(base) ? base : null;
}

export function languageLabel(code: string): string {
  return isLanguageCode(code) ? LABELS[code] : code;
}
