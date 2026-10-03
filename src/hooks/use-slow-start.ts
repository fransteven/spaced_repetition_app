'use client';

import { useEffect, useState } from 'react';

/** The AI and voice services sleep when idle on free hosting; the first request then waits for them to start. */
export const AI_STARTING_HINT = 'Starting the AI service… the first request after a while can take up to a minute.';
export const VOICE_STARTING_HINT = 'Starting the voice service… the first exam after a while can take up to a minute.';

const SLOW_START_MS = 4000;

/** True once `active` has lasted `afterMs`, so a slow start can be explained instead of leaving a silent spinner. */
export function useSlowStart(active: boolean, afterMs: number = SLOW_START_MS): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setSlow(true), afterMs);
    return () => {
      window.clearTimeout(timer);
      setSlow(false);
    };
  }, [active, afterMs]);
  return slow;
}
