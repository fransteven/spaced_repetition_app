'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { completeLogout, flushBeforeLogout } from '@/lib/offline/logout';
import { abortAllDownloads } from '@/components/offline/download-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';

export interface UseLogoutResult {
  /** Syncs, asks to confirm if changes would be lost, wipes this device's downloads and signs out. */
  requestLogout: () => void;
  /** A sign-out is in progress. */
  busy: boolean;
  /** Confirmation dialog — render it once next to the trigger (outside menus/sheets that unmount). */
  dialog: React.ReactNode;
}

export function useLogout(): UseLogoutResult {
  const [busy, setBusy] = useState(false);
  const [unsynced, setUnsynced] = useState<number | null>(null);

  const finish = useCallback(async (): Promise<void> => {
    setBusy(true);
    abortAllDownloads();
    try {
      await completeLogout();
    } catch (error) {
      console.error('[logout] sign-out failed', error);
      toast.error('Could not sign out', { description: 'Check your connection and try again.' });
      setBusy(false);
    }
  }, []);

  const requestLogout = useCallback((): void => {
    if (busy) return;
    setBusy(true);
    void (async () => {
      const toastId = toast.loading('Signing out…');
      const remaining = await flushBeforeLogout();
      toast.dismiss(toastId);
      if (remaining > 0) {
        setUnsynced(remaining);
        setBusy(false);
        return;
      }
      await finish();
    })();
  }, [busy, finish]);

  const dialog = (
    <Dialog
      open={unsynced !== null}
      onOpenChange={(open) => {
        if (!open) setUnsynced(null);
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Sign out and lose changes?</DialogTitle>
          <DialogDescription>
            You have <strong className="tabular">{unsynced ?? 0}</strong> unsynced{' '}
            {unsynced === 1 ? 'change' : 'changes'} that will be lost. Reconnect to sync{' '}
            {unsynced === 1 ? 'it' : 'them'} first, or sign out anyway. Downloads on this device are removed
            either way.
          </DialogDescription>
          <div className="flex items-center justify-end gap-3">
            <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                void finish();
              }}
            >
              {busy ? 'Signing out…' : 'Sign out anyway'}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );

  return { requestLogout, busy, dialog };
}
