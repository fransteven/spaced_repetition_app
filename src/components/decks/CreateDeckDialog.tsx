'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { DeckForm, type DeckFormValues } from '@/components/decks/DeckForm';
import { CreateDeckSchema } from '@/lib/validations';
import { unwrapError } from '@/lib/api-envelope';

interface CreateDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDeckDialog({
  open,
  onOpenChange,
}: CreateDeckDialogProps): React.JSX.Element {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<DeckFormValues>({
    resolver: zodResolver(CreateDeckSchema),
    defaultValues: { name: '', description: '', subject: '' },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: DeckFormValues): Promise<void> => {
    setSubmitError(null);

    const response = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json: unknown = await response.json();

    if (!response.ok) {
      setSubmitError(unwrapError(json, 'Unable to create deck'));
      return;
    }

    reset();
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>New deck</DialogTitle>
          <DialogDescription>Build a new intellectual stack.</DialogDescription>

          {submitError && <p className="text-body-sm text-destructive">{submitError}</p>}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <DeckForm form={form} idPrefix="create-deck" open={open} />

            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Create deck'}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
