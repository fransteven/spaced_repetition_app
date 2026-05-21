'use client';

import { useState } from 'react';
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
import { CreateDeckSchema } from '@/lib/validations';

type CreateDeckFormValues = z.infer<typeof CreateDeckSchema>;



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
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateDeckFormValues>({
    resolver: zodResolver(CreateDeckSchema),
    defaultValues: {
      name: '',
      description: '',
      subject: 'custom',
    },
  });

  const onSubmit = async (data: CreateDeckFormValues): Promise<void> => {
    setSubmitError(null);

    const parsed = CreateDeckSchema.safeParse(data);

    if (!parsed.success) {
      return;
    }

    const response = await fetch('/api/decks', {
      method: 'POST',
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
          : 'Unable to create deck';
      setSubmitError(message);
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

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-deck-name">Name</Label>
              <Input
                id="create-deck-name"
                placeholder="e.g. Neuroanatomy Basics"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="create-deck-description">Description</Label>
              <Textarea
                id="create-deck-description"
                rows={3}
                placeholder="What will you study?"
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="create-deck-subject">Subject</Label>
              <Input
                id="create-deck-subject"
                placeholder="e.g. Science, Languages, etc."
                aria-invalid={Boolean(errors.subject)}
                {...register('subject')}
              />
              {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
            </div>

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
