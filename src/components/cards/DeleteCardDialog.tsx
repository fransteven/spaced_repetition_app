'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { unwrapError } from '@/lib/api-envelope';

interface DeleteCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: { id: string; front: string };
}

/**
 * Card deletion used to fire straight from the row with no confirmation, and a
 * failed DELETE was swallowed silently. Mirrors DeleteDeckDialog.
 */
export function DeleteCardDialog({
  open,
  onOpenChange,
  card,
}: DeleteCardDialogProps): React.JSX.Element {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
      const json: unknown = await response.json();

      if (!response.ok) {
        setSubmitError(unwrapError(json, 'Unable to delete card'));
        setIsDeleting(false);
        return;
      }
    } catch (error) {
      console.error('[DeleteCardDialog]', error);
      setSubmitError('Network error — the card was not deleted.');
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Delete card</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{card.front.slice(0, 80)}</strong> and its review
            history. This action cannot be undone.
          </DialogDescription>

          {submitError && <p className="mb-4 text-body-sm text-destructive">{submitError}</p>}

          <div className="flex items-center justify-end gap-3">
            <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Cancel
            </DialogClose>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? 'Deleting…' : 'Delete card'}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
