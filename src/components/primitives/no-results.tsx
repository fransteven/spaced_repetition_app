import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface NoResultsProps {
  query?: string;
  message?: string;
  onClear: () => void;
  className?: string;
}

export function NoResults({
  query,
  message,
  onClear,
  className,
}: NoResultsProps): React.JSX.Element {
  const trimmed = query?.trim();

  return (
    <div className={cn('flex flex-col items-center gap-4 py-24 text-center', className)}>
      <p className="text-headline-md text-on-surface">
        {trimmed ? `No results match “${trimmed}”` : 'No results found'}
      </p>
      <p className="text-body-md text-on-surface-variant">
        {message ?? 'Try adjusting your search or clear the filters to see everything.'}
      </p>
      <Button type="button" variant="secondary" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
