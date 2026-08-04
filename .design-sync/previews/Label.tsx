import * as React from 'react';
import { Input, Label, Textarea } from 'spaced_repetition_app';
import { Info } from 'lucide-react';

/** Labels only pair with a control — the honest render is the pair. */
export function WithControls(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pv-lbl-name">Deck name</Label>
        <Input id="pv-lbl-name" placeholder="e.g. JLPT N3 Kanji" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pv-lbl-desc">Description</Label>
        <Textarea id="pv-lbl-desc" rows={2} placeholder="Optional" />
      </div>
    </div>
  );
}

/** The flex row with gap-2 means an icon or hint chip can sit inline. */
export function WithHint(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="pv-lbl-retention">
        Desired retention
        <Info className="size-3.5 text-on-surface-variant" />
        <span className="text-xs font-normal text-on-surface-variant">FSRS target</span>
      </Label>
      <Input id="pv-lbl-retention" defaultValue="0.90" />
    </div>
  );
}

/** Disabled peer dims the label automatically. */
export function DisabledPeer(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-2">
      <Input id="pv-lbl-tz" className="peer" defaultValue="America/Bogota" disabled />
      <Label htmlFor="pv-lbl-tz">Timezone (managed by your profile)</Label>
    </div>
  );
}
