'use client';

import { useEffect } from 'react';
import { isTextEntry } from '@/lib/is-text-entry';

export interface UseCommandPaletteHotkeyOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Global keyboard shortcuts for Command Palette (⌘K / Ctrl+K and /).
 *
 * - ⌘K / Ctrl+K toggles the palette even when focused on an input/textarea element.
 * - '/' opens the palette only when focus is NOT on a text entry field.
 */
export function useCommandPaletteHotkey({
  open,
  onOpenChange,
}: UseCommandPaletteHotkeyOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // ⌘K or Ctrl+K toggles open state, even within text inputs
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }

      // '/' opens palette only when not focused on a text entry field and without modifiers
      if (e.key === '/' && !open && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!isTextEntry(e.target)) {
          e.preventDefault();
          onOpenChange(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);
}
