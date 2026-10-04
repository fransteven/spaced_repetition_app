'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

// iPadOS Safari only ships the prefixed API; the unprefixed one covers the rest.
declare global {
  interface Document {
    webkitFullscreenEnabled?: boolean;
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
  }
  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void> | void;
  }
}

export type FullscreenSupport = 'api' | 'standalone' | 'install' | 'unknown';

export interface Fullscreen {
  /**
   * `api`: the Fullscreen API works (desktop, Android, iPad).
   * `standalone`: already running as an installed app — no browser bars to hide.
   * `install`: no API (iPhone Safari); the only way to drop the bars is "Add to Home Screen".
   */
  support: FullscreenSupport;
  active: boolean;
  toggle: () => void;
}

function fullscreenElement(): Element | null {
  return document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
}

function detectSupport(): FullscreenSupport {
  if (document.fullscreenEnabled || document.webkitFullscreenEnabled) return 'api';
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
  return standalone ? 'standalone' : 'install';
}

function subscribe(onChange: () => void): () => void {
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    document.removeEventListener('fullscreenchange', onChange);
    document.removeEventListener('webkitfullscreenchange', onChange);
  };
}

const noopSubscribe = (): (() => void) => () => undefined;

/**
 * Fullscreen for the whole document, so portalled sheets and dialogs stay visible.
 * `onChange` fires when the user enters or leaves (button, "f", Esc or the browser UI).
 */
export function useFullscreen(onChange?: (active: boolean) => void): Fullscreen {
  const support = useSyncExternalStore(noopSubscribe, detectSupport, (): FullscreenSupport => 'unknown');
  const active = useSyncExternalStore(subscribe, () => fullscreenElement() !== null, () => false);

  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });

  useEffect(() => {
    const unsubscribe = subscribe(() => latest.current?.(fullscreenElement() !== null));
    return () => {
      unsubscribe();
      // Leaving the reader must never strand the rest of the app in fullscreen.
      if (fullscreenElement()) void exitFullscreen();
    };
  }, []);

  const toggle = useCallback((): void => {
    if (fullscreenElement()) void exitFullscreen();
    else void enterFullscreen();
  }, []);

  return { support, active, toggle };
}

async function enterFullscreen(): Promise<void> {
  const root = document.documentElement;
  try {
    if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
    else await root.webkitRequestFullscreen?.();
  } catch {
    // Rejected (no user gesture, or blocked by the browser): stay windowed.
  }
}

async function exitFullscreen(): Promise<void> {
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else await document.webkitExitFullscreen?.();
  } catch {
    // Already left (e.g. the user pressed Esc).
  }
}
