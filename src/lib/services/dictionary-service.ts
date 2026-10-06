import {
  lemmaToFollow,
  parseWiktionary,
  WiktionaryResponseSchema,
  type DictionaryResult,
  type WiktionaryResponse,
} from '@/lib/dictionary/wiktionary';

/**
 * dictionary-service.ts — word definitions for the reader's lookup panel.
 *
 * Source: en.wiktionary's REST definition endpoint (free, no key, any language,
 * definitions written in English). Responses are cached by Next's fetch cache;
 * a failure degrades to "no entry" so the translation still works.
 */

const ENDPOINT = 'https://en.wiktionary.org/api/rest_v1/page/definition/';
const PAGE = 'https://en.wiktionary.org/wiki/';
const TIMEOUT_MS = 5000;
const CACHE_SECONDS = 60 * 60 * 24 * 7;

async function fetchDefinitions(word: string): Promise<WiktionaryResponse | null> {
  const response = await fetch(`${ENDPOINT}${encodeURIComponent(word)}`, {
    headers: { 'User-Agent': 'NeuroCards/1.0 (reader dictionary)', Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: CACHE_SECONDS },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Wiktionary HTTP ${response.status}`);
  const parsed = WiktionaryResponseSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : null;
}

export async function lookupDefinition(word: string, language: string | null): Promise<DictionaryResult> {
  // A sentence-initial capital ("Early") is usually the common word; its own page is often only a
  // proper noun ("A surname"). Look up both, common word first.
  const lower = word.toLowerCase();
  const forms = lower === word ? [word] : [lower, word];
  const pages = await Promise.all(forms.map((form) => fetchDefinitions(form)));

  const found = forms.map((form, index) => ({ form, data: pages[index] })).filter((page) => page.data !== null);
  const entries = found.flatMap((page) => (page.data ? parseWiktionary(page.form, page.data, language) : []));
  const primary = found.find((page) => page.data && parseWiktionary(page.form, page.data, language).length > 0);
  if (!primary?.data) return { word, entries, source_url: `${PAGE}${encodeURIComponent(lower)}` };

  const lemma = lemmaToFollow(primary.form, primary.data, language);
  if (lemma) {
    const lemmaData = await fetchDefinitions(lemma).catch(() => null);
    if (lemmaData) {
      return {
        word: primary.form,
        entries: [...entries, ...parseWiktionary(lemma, lemmaData, language)],
        source_url: `${PAGE}${encodeURIComponent(lemma)}`,
      };
    }
  }
  return { word: primary.form, entries, source_url: `${PAGE}${encodeURIComponent(primary.form)}` };
}
