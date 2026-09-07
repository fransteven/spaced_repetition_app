'use client';

import { useState, useMemo, useDeferredValue } from 'react';

export interface ListSearch<T> {
  query: string;
  setQuery: (value: string) => void;
  results: T[];
  /** true when there is non-whitespace text in the search input */
  isSearching: boolean;
  clear: () => void;
}

/**
 * Normalizes text by removing diacritics and converting to lowercase.
 * e.g. "Matemática" -> "matematica"
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Shared hook for client-side list filtering.
 *
 * - Normalizes characters (removing accents/diacritics) and converts to lowercase.
 * - Tokenizes query by whitespace, requiring all tokens to match the combined haystack (AND).
 * - Uses React 19's `useDeferredValue` to keep typing responsive without external debounce libraries.
 *
 * @param items The list of items to search.
 * @param getHaystack Function returning searchable string attributes for each item.
 *                    Callers must wrap this function in `useCallback` or pass a stable reference.
 */
export function useListSearch<T>(
  items: T[],
  getHaystack: (item: T) => Array<string | null | undefined>,
): ListSearch<T> {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const isSearching = query.trim().length > 0;

  const results = useMemo(() => {
    const trimmed = deferredQuery.trim();
    if (!trimmed) {
      return items;
    }

    const tokens = normalizeSearchText(trimmed)
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) {
      return items;
    }

    return items.filter((item) => {
      const parts = getHaystack(item);
      const combined = parts
        .filter((part): part is string => typeof part === 'string' && part.length > 0)
        .join(' ');
      const normalizedHaystack = normalizeSearchText(combined);

      return tokens.every((token) => normalizedHaystack.includes(token));
    });
  }, [items, deferredQuery, getHaystack]);

  const clear = (): void => {
    setQuery('');
  };

  return {
    query,
    setQuery,
    results,
    isSearching,
    clear,
  };
}
