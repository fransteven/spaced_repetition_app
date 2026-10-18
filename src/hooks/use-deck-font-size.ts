'use client';

import { useSyncExternalStore } from 'react';
import { parseDeckFontSize, type DeckFontSize } from '@/lib/deck-typography';

const STORAGE_KEY = 'neurocards:deck-font-size';
const CHANGE_EVENT = 'neurocards:deck-font-size-change';
let fallback: DeckFontSize = 'comfortable';
let storageUnavailable = false;

function getSnapshot(): DeckFontSize {
  if (storageUnavailable) return fallback;
  try {
    return parseDeckFontSize(window.localStorage.getItem(STORAGE_KEY) ?? fallback);
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function setFontSize(value: DeckFontSize): void {
  fallback = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
    // Keep the selection for this visit when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function getServerSnapshot(): DeckFontSize {
  return 'comfortable';
}

export function useDeckFontSize(): { fontSize: DeckFontSize; setFontSize: (value: DeckFontSize) => void } {
  const fontSize = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { fontSize, setFontSize };
}
