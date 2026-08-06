import Link from 'next/link';
import { SearchX } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';

export default function DeckNotFound(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-highest">
        <SearchX className="h-9 w-9 text-on-surface-variant" />
      </div>
      <h1 className="text-display-sm text-on-surface">Deck not found</h1>
      <p className="text-body-lg text-on-surface-variant">
        It may have been deleted, or it belongs to another account.
      </p>
      <Link href="/decks" className={buttonVariants()}>
        Back to my decks
      </Link>
    </div>
  );
}
