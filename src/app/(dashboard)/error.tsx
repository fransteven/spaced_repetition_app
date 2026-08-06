'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error('[dashboard]', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error/10">
        <AlertTriangle className="h-9 w-9 text-error" />
      </div>
      <h1 className="text-headline-lg text-on-surface">Something broke on our side</h1>
      <p className="text-body-lg text-on-surface-variant">
        The page could not be loaded. Trying again usually resolves it.
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
