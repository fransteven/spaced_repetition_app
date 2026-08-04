import * as React from 'react';
import { Button } from 'spaced_repetition_app';
import { ArrowRight, Plus, Trash2, RefreshCw, Pencil } from 'lucide-react';

export function Variants(): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Study now</Button>
      <Button variant="secondary">Review</Button>
      <Button variant="outline">Import deck</Button>
      <Button variant="ghost">Edit deck</Button>
      <Button variant="destructive">Delete deck</Button>
      <Button variant="link">View all decks</Button>
    </div>
  );
}

export function Sizes(): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}

export function WithIcons(): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        Study now
        <ArrowRight />
      </Button>
      <Button variant="secondary">
        <RefreshCw />
        Review
      </Button>
      <Button variant="ghost">
        <Plus />
        Add cards
      </Button>
      <Button variant="destructive">
        <Trash2 />
        Delete
      </Button>
    </div>
  );
}

export function IconOnly(): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="icon-xs" variant="ghost" aria-label="Edit deck">
        <Pencil />
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Add cards">
        <Plus />
      </Button>
      <Button size="icon" variant="outline" aria-label="Refresh schedule">
        <RefreshCw />
      </Button>
      <Button size="icon-lg" aria-label="Start session">
        <ArrowRight />
      </Button>
    </div>
  );
}

export function Disabled(): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>Study now</Button>
      <Button variant="secondary" disabled>
        Review
      </Button>
      <Button variant="outline" disabled>
        Import deck
      </Button>
      <Button variant="ghost" disabled>
        Edit deck
      </Button>
    </div>
  );
}
