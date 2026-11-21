import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CHIP_CLASS = 'h-7 gap-1 rounded-full px-3 text-label-sm font-semibold tracking-wider';

/** FilterChip look for a real link (e.g. tabs that are routes), where a <button> role would be wrong. */
export function filterChipClassName(active: boolean, className?: string): string {
  return cn(buttonVariants({ variant: active ? 'default' : 'ghost' }), CHIP_CLASS, className);
}

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
      className={cn(CHIP_CLASS, className)}
      {...props}
    />
  );
}
