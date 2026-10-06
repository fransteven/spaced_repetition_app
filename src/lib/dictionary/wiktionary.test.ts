import { describe, expect, it } from 'vitest';

import { formOfLemma, htmlToText, lemmaToFollow, parseWiktionary, WiktionaryResponseSchema } from '@/lib/dictionary/wiktionary';
import early from '@/lib/dictionary/__fixtures__/early.json';
import running from '@/lib/dictionary/__fixtures__/running.json';
import children from '@/lib/dictionary/__fixtures__/children.json';

const parse = (data: unknown): ReturnType<typeof WiktionaryResponseSchema.parse> => WiktionaryResponseSchema.parse(data);

describe('htmlToText', () => {
  it('strips tags, decodes entities and drops nested sense lists', () => {
    expect(htmlToText('<a href="/wiki/x">Flowing</a>; <b>easy</b> &amp; &#8220;fast&#8221;')).toBe('Flowing; easy & “fast”');
    expect(htmlToText('Moving at a run.\n<ol><li>Of a horse</li></ol>')).toBe('Moving at a run.');
  });
});

describe('parseWiktionary', () => {
  it('keeps the entries of the book language, as plain text', () => {
    const entries = parseWiktionary('early', parse(early), 'en-US');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.language === 'English')).toBe(true);
    for (const entry of entries) {
      for (const sense of entry.senses) {
        expect(sense.definition).not.toMatch(/[<>]/);
        expect(sense.examples.length).toBeLessThanOrEqual(2);
      }
      expect(entry.senses.length).toBeLessThanOrEqual(5);
    }
  });

  it('falls back to the languages Wiktionary has when the book language is missing', () => {
    const entries = parseWiktionary('running', parse(running), 'de');
    expect(new Set(entries.map((entry) => entry.language)).size).toBeGreaterThan(1);
  });
});

describe('lemmas', () => {
  it('reads the lemma of a "form of" definition', () => {
    expect(formOfLemma('plural of <span class="form-of-definition-link"><i><a href="/wiki/child#English" title="child">child</a></i></span>')).toBe('child');
    expect(formOfLemma('A young person.')).toBeNull();
  });

  it('follows the lemma only when the word has no meaning of its own', () => {
    expect(lemmaToFollow('children', parse(children), 'en')).toBe('child');
    expect(lemmaToFollow('running', parse(running), 'en')).toBeNull(); // also an adjective
  });
});
