import * as React from 'react';
import { Input, Label } from 'spaced_repetition_app';

/** The canonical field: Label bound to Input by id. */
export function WithLabel(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="pv-deck-name">Deck name</Label>
      <Input id="pv-deck-name" placeholder="e.g. Organic Chemistry" />
    </div>
  );
}

export function Filled(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="pv-email">Email</Label>
      <Input id="pv-email" type="email" defaultValue="alex.rivera@neurocards.app" />
    </div>
  );
}

/** aria-invalid drives the destructive border and ring — never hand-colour it. */
export function Invalid(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="pv-invalid">Deck name</Label>
      <Input id="pv-invalid" defaultValue="" aria-invalid placeholder="Required" />
      <p className="text-xs text-destructive">Deck name is required.</p>
    </div>
  );
}

export function Disabled(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="pv-disabled">Timezone</Label>
      <Input id="pv-disabled" defaultValue="America/Bogota" disabled />
    </div>
  );
}

export function Types(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-4">
      <Input type="search" placeholder="Search decks…" />
      <Input type="password" defaultValue="correct-horse-battery" />
      <Input type="number" defaultValue={20} />
    </div>
  );
}
