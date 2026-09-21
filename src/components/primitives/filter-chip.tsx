import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterChipProps
  extends Omit<React.ComponentProps<typeof Button>, 'variant' | 'size'> {
  active: boolean;
}

export function FilterChip({
  active,
  className,
  ...props
}: FilterChipProps): React.ReactElement {
  return (
    <Button
      variant={active ? 'default' : 'ghost'}
      className={cn(
        'h-7 gap-1 rounded-full px-3 text-label-sm font-semibold tracking-wider',
        className
      )}
      {...props}
    />
  );
}
