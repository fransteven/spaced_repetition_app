'use client';

import { useEffect, useState } from 'react';
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
import type { DeckWithStats } from '@/components/decks/DeckCard';

interface EditDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: Pick<DeckWithStats, 'id' | 'name' | 'description' | 'subject'>;
}

export function EditDeckDialog({
  open,
  onOpenChange,
  initialValues,
}: EditDeckDialogProps): React.JSX.Element {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Edit validates against the create schema on purpose: the form always sends
  // all three fields, so the looser UpdateDeckSchema would let an empty name
  // through the client and only fail server-side.
  const form = useForm<DeckFormValues>({
    resolver: zodResolver(CreateDeckSchema),
    defaultValues: {
      name: initialValues.name,
      description: initialValues.description ?? '',
      subject: initialValues.subject,
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  const [prevId, setPrevId] = useState(initialValues.id);
  if (initialValues.id !== prevId) {
    setPrevId(initialValues.id);
    setSubmitError(null);
  }

  useEffect(() => {
    reset({
      name: initialValues.name,
      description: initialValues.description ?? '',
      subject: initialValues.subject,
    });
  }, [initialValues.description, initialValues.name, initialValues.subject, reset]);

  const onSubmit = async (data: DeckFormValues): Promise<void> => {
    setSubmitError(null);

    const response = await fetch(`/api/decks/${initialValues.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json: unknown = await response.json();

    if (!response.ok) {
      setSubmitError(unwrapError(json, 'Unable to update deck'));
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
          <DialogTitle>Edit deck</DialogTitle>
          <DialogDescription>Update your deck details.</DialogDescription>

          {submitError && <p className="text-body-sm text-destructive">{submitError}</p>}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <DeckForm form={form} idPrefix="edit-deck" open={open} />

            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
