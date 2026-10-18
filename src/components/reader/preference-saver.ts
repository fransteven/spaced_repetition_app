import type { ReaderPreferences } from '@/lib/services/reader-preferences-service';

export type PreferenceSaveStatus = 'saved' | 'saving' | 'error';

export interface PreferenceSaver {
  schedule: (preferences: ReaderPreferences) => void;
  flush: () => Promise<void>;
  retry: () => Promise<void>;
}

/** Coalesce changes before sending; never let an older write finish after a newer one. */
export function createPreferenceSaver(
  save: (preferences: ReaderPreferences) => Promise<boolean>,
  onStatus: (status: PreferenceSaveStatus) => void,
  debounceMs: number
): PreferenceSaver {
  let pending: ReaderPreferences | null = null;
  let latest: ReaderPreferences | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;

  const drain = async (): Promise<void> => {
    while (pending) {
      const current = pending;
      pending = null;
      let saved = false;
      try { saved = await save(current); } catch { /* Network failures remain retryable. */ }
      if (!pending) onStatus(saved ? 'saved' : 'error');
    }
  };

  const flush = (): Promise<void> => {
    clearTimeout(timer);
    if (!inFlight && pending) {
      onStatus('saving');
      inFlight = drain().finally(() => { inFlight = null; });
    }
    return inFlight ?? Promise.resolve();
  };

  return {
    schedule: (preferences): void => {
      latest = preferences;
      pending = preferences;
      onStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(() => { void flush(); }, debounceMs);
    },
    flush,
    retry: (): Promise<void> => {
      if (latest) pending = latest;
      return flush();
    },
  };
}
