'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteMindMapAction } from '@/app/actions/mind-map-actions';

interface MindMapActionsMenuProps {
  id: string;
  title: string;
  markdown: string;
}

export function MindMapActionsMenu({ id, title, markdown }: MindMapActionsMenuProps): React.JSX.Element {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success('Markdown copied');
    } catch {
      toast.error('Could not copy to the clipboard');
    }
  };

  const remove = async (): Promise<void> => {
    setDeleting(true);
    const result = await deleteMindMapAction(id);
    if (result.error) {
      toast.error(result.error.message);
      setDeleting(false);
      return;
    }
    setConfirmOpen(false);
    toast.success('Mind map deleted');
    router.push('/mind-maps');
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/mind-maps/${id}/edit`} className={buttonVariants({ size: 'lg' })}>
        <Pencil data-icon="inline-start" />
        Edit
      </Link>
      <Button type="button" variant="ghost" size="lg" onClick={() => void copy()}>
        <Copy data-icon="inline-start" />
        Copy Markdown
      </Button>
      <Button type="button" variant="ghost" size="icon-lg" aria-label="Delete mind map" onClick={() => setConfirmOpen(true)}>
        <Trash2 />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>Delete mind map</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{title}</strong>. This action cannot be undone.
            </DialogDescription>
            <div className="flex items-center justify-end gap-3">
              <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </DialogClose>
              <Button type="button" variant="destructive" disabled={deleting} onClick={() => void remove()}>
                {deleting ? 'Deleting…' : 'Delete mind map'}
              </Button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
