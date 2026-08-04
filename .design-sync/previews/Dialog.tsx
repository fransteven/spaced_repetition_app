import * as React from 'react';
import {
  Button,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from 'spaced_repetition_app';

/** The canonical composition: the app's "Edit deck" dialog, open. */
export function EditDeck(): React.JSX.Element {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Edit deck</DialogTitle>
          <DialogDescription>
            Rename the deck or refine its description. Scheduling is unaffected.
          </DialogDescription>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dlg-deck-name">Deck name</Label>
              <Input id="dlg-deck-name" defaultValue="Organic Chemistry — Reactions" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dlg-deck-desc">Description</Label>
              <Textarea
                id="dlg-deck-desc"
                rows={3}
                defaultValue="Named reactions, mechanisms, and reagent selectivity for the second-semester exam."
              />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
            <Button>Save changes</Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

/** Destructive confirmation — tinted destructive action, not a solid red button. */
export function DeleteConfirmation(): React.JSX.Element {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Delete “Organic Chemistry”?</DialogTitle>
          <DialogDescription>
            This removes 128 cards and their review history. Deleting a deck cannot be undone.
          </DialogDescription>
          <div className="flex items-center justify-end gap-3">
            <DialogClose render={<Button variant="ghost">Keep deck</Button>} />
            <Button variant="destructive">Delete deck</Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

/** Closed root: only the trigger renders — how the dialog sits in a page. */
export function Trigger(): React.JSX.Element {
  return (
    <Dialog>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>New deck</DialogTitle>
          <DialogDescription>Give the deck a name to get started.</DialogDescription>
        </DialogPopup>
      </DialogPortal>
      <Button variant="outline">New deck</Button>
    </Dialog>
  );
}
