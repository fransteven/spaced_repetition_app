import { z } from 'zod';

/**
 * wiktionary.ts — parses en.wiktionary's REST definition endpoint
 * (GET /api/rest_v1/page/definition/{word}) into plain-text dictionary entries.
 *
 * The endpoint groups entries by the word's language code and always writes the
 * definitions in English. Definitions and examples are HTML; everything is reduced
 * to plain text here, so nothing from Wiktionary is ever rendered as markup.
 */

const MAX_SENSES = 5;
const MAX_EXAMPLES = 2;
const MAX_LANGUAGES = 3;

const DefinitionSchema = z.object({
  definition: z.string(),
  examples: z.array(z.string()).optional(),
  parsedExamples: z.array(z.object({ example: z.string() })).optional(),
});

const EntrySchema = z.object({
  partOfSpeech: z.string(),
  language: z.string(),
  definitions: z.array(DefinitionSchema),
});

export const WiktionaryResponseSchema = z.record(z.string(), z.array(EntrySchema));
export type WiktionaryResponse = z.infer<typeof WiktionaryResponseSchema>;

const DictionaryEntrySchema = z.object({
  word: z.string(),
  language: z.string(),
  partOfSpeech: z.string(),
  senses: z.array(z.object({ definition: z.string(), examples: z.array(z.string()) })),
});
export type DictionaryEntry = z.infer<typeof DictionaryEntrySchema>;

/** Payload of GET /api/dictionary (validated again on the client). */
export const DictionaryResultSchema = z.object({
  word: z.string(),
  entries: z.array(DictionaryEntrySchema),
  /** Wiktionary page for "see more" (the lemma's page when the word is only an inflection). */
  source_url: z.string().url(),
});
export type DictionaryResult = z.infer<typeof DictionaryResultSchema>;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** HTML → plain text. Nested sense lists are dropped: Wiktionary repeats them as their own definitions. */
export function htmlToText(html: string): string {
  const withoutLists = html.replace(/<(ol|ul|dl)[\s\S]*?<\/\1>/gi, ' ');
  return decodeEntities(withoutLists.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lemma of a "form of" definition ("present participle of run" → "run"), else null. */
export function formOfLemma(html: string): string | null {
  const match = /form-of-definition-link[\s\S]*?<a\b[^>]*\btitle="([^"]+)"/i.exec(html);
  if (!match) return null;
  const lemma = decodeEntities(match[1]).split('#')[0].trim();
  return lemma || null;
}

function baseLanguage(code: string | null): string | null {
  const base = code?.trim().toLowerCase().split(/[-_]/)[0];
  return base || null;
}

/**
 * Entries for `word`, in the book's language when Wiktionary has it, otherwise
 * the first few languages it does have.
 */
export function parseWiktionary(word: string, data: WiktionaryResponse, language: string | null): DictionaryEntry[] {
  const preferred = baseLanguage(language);
  const codes = preferred && data[preferred]?.length ? [preferred] : Object.keys(data).slice(0, MAX_LANGUAGES);

  return codes.flatMap((code) =>
    (data[code] ?? []).flatMap((entry) => {
      const senses = entry.definitions
        .map((item) => {
          const examples = item.parsedExamples?.map((example) => example.example) ?? item.examples ?? [];
          return {
            definition: htmlToText(item.definition),
            examples: examples.map(htmlToText).filter(Boolean).slice(0, MAX_EXAMPLES),
          };
        })
        .filter((sense) => sense.definition.length > 0)
        .slice(0, MAX_SENSES);
      return senses.length ? [{ word, language: entry.language, partOfSpeech: entry.partOfSpeech, senses }] : [];
    })
  );
}

/** The lemma to look up as well, when every entry of the preferred language only says "form of X". */
export function lemmaToFollow(word: string, data: WiktionaryResponse, language: string | null): string | null {
  const preferred = baseLanguage(language);
  const entries = (preferred && data[preferred]) || Object.values(data)[0] || [];
  const lemmas = entries.flatMap((entry) => entry.definitions.map((item) => formOfLemma(item.definition)));
  const first = lemmas.find((lemma): lemma is string => lemma !== null);
  if (!first || first.toLowerCase() === word.toLowerCase()) return null;
  // Only follow when the word has no meaning of its own besides being a form of the lemma.
  const ownSenses = entries.some((entry) =>
    entry.definitions.some((item) => formOfLemma(item.definition) === null && htmlToText(item.definition).length > 0)
  );
  return ownSenses ? null : first;
}
