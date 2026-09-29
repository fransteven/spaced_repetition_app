'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
import { Textarea } from '@/components/ui/textarea';
import { AnnotationNoteFormSchema, type AnnotationNoteFormValues } from '@/lib/validations';

interface AnnotationNoteDialogProps {
  quote: string;
  initialNote: string | null;
  onSave: (note: string) => Promise<void>;
  onClose: () => void;
}

export function AnnotationNoteDialog({
  quote,
  initialNote,
  onSave,
  onClose,
}: AnnotationNoteDialogProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AnnotationNoteFormValues>({
    resolver: zodResolver(AnnotationNoteFormSchema),
    defaultValues: { note: initialNote ?? '' },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>{initialNote ? 'Edit note' : 'Add note'}</DialogTitle>
          <DialogDescription className="line-clamp-4 italic">“{quote}”</DialogDescription>
          <form
            onSubmit={handleSubmit(async ({ note }) => {
              await onSave(note);
              onClose();
            })}
            className="space-y-4"
          >
            <Textarea
              autoFocus
              rows={5}
              placeholder="Write your thoughts about this passage…"
              aria-invalid={errors.note ? true : undefined}
              {...register('note')}
            />
            {errors.note && <p className="text-body-sm text-destructive">{errors.note.message}</p>}
            <div className="flex items-center justify-end gap-3">
              <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save note'}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
