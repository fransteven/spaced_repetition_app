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
import type { LibraryBook } from '@/lib/services/book-service';

interface DeleteBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Pick<LibraryBook, 'id' | 'title'>;
}

export function DeleteBookDialog({ open, onOpenChange, book }: DeleteBookDialogProps): React.JSX.Element {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);
    setSubmitError(null);

    const response = await fetch(`/api/books/${book.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setSubmitError(unwrapError(await response.json(), 'Unable to delete book'));
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
          <DialogTitle>Delete book</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{book.title}</strong>, your reading progress and all
            its highlights and notes. This action cannot be undone.
          </DialogDescription>

          {submitError && <p className="mb-4 text-sm text-destructive">{submitError}</p>}

          <div className="flex items-center justify-end gap-3">
            <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Cancel
            </DialogClose>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? 'Deleting…' : 'Delete book'}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
