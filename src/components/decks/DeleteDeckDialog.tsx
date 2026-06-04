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
import type { DeckWithStats } from '@/components/decks/DeckCard';

interface DeleteDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Pick<DeckWithStats, 'id' | 'name' | 'total_cards'>;
}

export function DeleteDeckDialog({
  open,
  onOpenChange,
  deck,
}: DeleteDeckDialogProps): React.JSX.Element {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);
    setSubmitError(null);

    const response = await fetch(`/api/decks/${deck.id}`, { method: 'DELETE' });
    const json: unknown = await response.json();

    if (!response.ok) {
      const message =
        typeof json === 'object' &&
        json !== null &&
        'error' in json &&
        typeof json.error === 'object' &&
        json.error !== null &&
        'message' in json.error &&
        typeof json.error.message === 'string'
          ? json.error.message
          : 'Unable to delete deck';
      setSubmitError(message);
      setIsDeleting(false);
      return;
    }

    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Delete deck</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{deck.name}</strong> and its{' '}
            {deck.total_cards > 0 ? (
              <>
                <strong>{deck.total_cards}</strong>{' '}
                {deck.total_cards === 1 ? 'card' : 'cards'} and all study progress.{' '}
              </>
            ) : (
              'study progress. '
            )}
            This action cannot be undone.
          </DialogDescription>

          {submitError && (
            <p className="mb-4 text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex items-center justify-end gap-3">
            <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting…' : 'Delete deck'}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
