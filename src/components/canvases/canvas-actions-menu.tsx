'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteCanvasAction, renameCanvasAction } from '@/app/actions/canvas-actions';
import { RenameCanvasSchema, type RenameCanvasValues } from '@/lib/validations';

const CANCEL_CLASS = 'px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground';

export function CanvasActionsMenu({ id, title }: { id: string; title: string }): React.JSX.Element {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RenameCanvasValues>({ resolver: zodResolver(RenameCanvasSchema), defaultValues: { title } });

  const rename = async (values: RenameCanvasValues): Promise<void> => {
    const result = await renameCanvasAction(id, values);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setRenameOpen(false);
    router.refresh();
  };

  const remove = async (): Promise<void> => {
    setDeleting(true);
    const result = await deleteCanvasAction(id);
    if (result.error) {
      toast.error(result.error.message);
      setDeleting(false);
      return;
    }
    setConfirmOpen(false);
    toast.success('Canvas deleted');
    router.push('/mind-maps/canvases');
    router.refresh();
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label="Rename canvas"
        onClick={() => {
          reset({ title });
          setRenameOpen(true);
        }}
      >
        <Pencil />
      </Button>
      <Button type="button" variant="ghost" size="icon-lg" aria-label="Delete canvas" onClick={() => setConfirmOpen(true)}>
        <Trash2 />
      </Button>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>Rename canvas</DialogTitle>
            <form className="space-y-4" onSubmit={handleSubmit(rename)}>
              <div className="space-y-2">
                <Label htmlFor="canvas-title">Title</Label>
                <Input id="canvas-title" autoComplete="off" aria-invalid={Boolean(errors.title)} {...register('title')} />
                {errors.title && <p className="text-body-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div className="flex items-center justify-end gap-3">
                <DialogClose className={CANCEL_CLASS}>Cancel</DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogPopup>
        </DialogPortal>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>Delete canvas</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{title}</strong>. This action cannot be undone.
            </DialogDescription>
            <div className="flex items-center justify-end gap-3">
              <DialogClose className={CANCEL_CLASS}>Cancel</DialogClose>
              <Button type="button" variant="destructive" disabled={deleting} onClick={() => void remove()}>
                {deleting ? 'Deleting…' : 'Delete canvas'}
              </Button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
