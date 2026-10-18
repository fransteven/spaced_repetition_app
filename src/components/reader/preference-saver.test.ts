import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPreferenceSaver } from './preference-saver';
import { DEFAULT_READER_PREFERENCES } from '@/lib/reader-options';
import type { ReaderPreferences } from '@/lib/services/reader-preferences-service';

afterEach(() => { vi.useRealTimers(); });

describe('serialized preference saving', () => {
  it('debounces rapid changes into the last choice', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (): Promise<boolean> => true);
    const status = vi.fn();
    const saver = createPreferenceSaver(save, status, 500);
    saver.schedule(DEFAULT_READER_PREFERENCES);
    const latest: ReaderPreferences = { ...DEFAULT_READER_PREFERENCES, theme: 'slate' };
    saver.schedule(latest);
    await vi.advanceTimersByTimeAsync(499);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledExactlyOnceWith(latest);
    expect(status).toHaveBeenLastCalledWith('saved');
  });

  it('never overlaps writes and saves the latest change after an in-flight request', async () => {
    let release: ((saved: boolean) => void) | undefined;
    const save = vi.fn<(preferences: ReaderPreferences) => Promise<boolean>>(() => new Promise((resolve) => { release = resolve; }));
    const saver = createPreferenceSaver(save, vi.fn(), 500);
    saver.schedule(DEFAULT_READER_PREFERENCES);
    const first = saver.flush();
    saver.schedule({ ...DEFAULT_READER_PREFERENCES, theme: 'paper' });
    const latest: ReaderPreferences = { ...DEFAULT_READER_PREFERENCES, theme: 'sage' };
    saver.schedule(latest);
    expect(save).toHaveBeenCalledTimes(1);
    release?.(true);
    await Promise.resolve();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(latest);
    release?.(true);
    await first;
  });

  it('flushes immediately on close and retries both action errors and network failures', async () => {
    const save = vi.fn(async (): Promise<boolean> => false);
    const status = vi.fn();
    const saver = createPreferenceSaver(save, status, 500);
    saver.schedule(DEFAULT_READER_PREFERENCES);
    await saver.flush();
    expect(status).toHaveBeenLastCalledWith('error');
    save.mockRejectedValueOnce(new Error('offline'));
    await saver.retry();
    expect(status).toHaveBeenLastCalledWith('error');
    save.mockResolvedValueOnce(true);
    await saver.retry();
    expect(save).toHaveBeenLastCalledWith(DEFAULT_READER_PREFERENCES);
    expect(status).toHaveBeenLastCalledWith('saved');
  });
});
