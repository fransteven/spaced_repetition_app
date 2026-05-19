'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UpdateDeckSchema } from '@/lib/validations';
import type { DeckWithStats } from '@/components/decks/DeckCard';

type EditDeckFormValues = z.infer<typeof UpdateDeckSchema>;

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditDeckFormValues>({
    resolver: zodResolver(UpdateDeckSchema),
    defaultValues: {
      name: initialValues.name,
      description: initialValues.description ?? '',
    },
  });

  useEffect(() => {
    reset({
      name: initialValues.name,
      description: initialValues.description ?? '',
    });
    setSubmitError(null);
  }, [initialValues.description, initialValues.name, reset]);

  const onSubmit = async (data: EditDeckFormValues): Promise<void> => {
    setSubmitError(null);

    const parsed = UpdateDeckSchema.safeParse(data);

    if (!parsed.success) {
      return;
    }

    const response = await fetch(`/api/decks/${initialValues.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
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
          : 'Unable to update deck';
      setSubmitError(message);
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

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-deck-name">Name</Label>
              <Input
                id="edit-deck-name"
                placeholder="e.g. Neuroanatomy Basics"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-deck-description">Description</Label>
              <Textarea
                id="edit-deck-description"
                rows={3}
                placeholder="What will you study?"
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Subject: <span className="font-medium text-foreground">{initialValues.subject}</span>
            </div>

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
