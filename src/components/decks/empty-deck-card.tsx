'use client';

import { FolderPlus } from 'lucide-react';
import { EmptyState } from '@/components/primitives/empty-state';
import { Button } from '@/components/ui/button';

interface EmptyDeckCardProps {
  onClick: () => void;
}

export function EmptyDeckCard({ onClick }: EmptyDeckCardProps): React.JSX.Element {
  return (
    <EmptyState
      icon={<FolderPlus className="size-9" />}
      title="Mental space"
      body="Nothing to review yet. Build your first intellectual stack and the schedule takes care of itself."
      action={
        <Button size="lg" onClick={onClick} className="cursor-pointer font-semibold">
          Create your first deck
        </Button>
      }
    />
  );
}
