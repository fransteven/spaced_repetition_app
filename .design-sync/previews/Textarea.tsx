import * as React from 'react';
import { Label, Textarea } from 'spaced_repetition_app';

/** Card authoring — the answer side accepts markdown. */
export function CardAnswer(): React.JSX.Element {
  return (
    <div className="max-w-lg space-y-2">
      <Label htmlFor="pv-answer">Answer</Label>
      <Textarea
        id="pv-answer"
        rows={4}
        defaultValue={
          'The **Diels–Alder** reaction is a [4+2] cycloaddition between a conjugated diene and a dienophile.\n\nStereochemistry is *suprafacial* on both components.'
        }
      />
    </div>
  );
}

export function Empty(): React.JSX.Element {
  return (
    <div className="max-w-lg space-y-2">
      <Label htmlFor="pv-desc">Description</Label>
      <Textarea id="pv-desc" rows={3} placeholder="What is this deck for? (optional)" />
    </div>
  );
}

export function Invalid(): React.JSX.Element {
  return (
    <div className="max-w-lg space-y-2">
      <Label htmlFor="pv-front">Question</Label>
      <Textarea id="pv-front" rows={3} aria-invalid defaultValue="" placeholder="Required" />
      <p className="text-xs text-destructive">A card needs a question.</p>
    </div>
  );
}

export function Disabled(): React.JSX.Element {
  return (
    <div className="max-w-lg space-y-2">
      <Label htmlFor="pv-locked">Answer</Label>
      <Textarea
        id="pv-locked"
        rows={3}
        disabled
        defaultValue="Locked while the review is being scored."
      />
    </div>
  );
}
