import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

describe('cn', () => {
  it('keeps a colour class next to a type-scale size', () => {
    expect(cn('bg-primary text-primary-foreground', 'text-label-sm')).toBe('bg-primary text-primary-foreground text-label-sm');
  });

  it('still lets a later size or colour win', () => {
    expect(cn('text-body-sm text-on-surface', 'text-label-md')).toBe('text-on-surface text-label-md');
    expect(cn('text-on-surface text-body-md', 'text-primary')).toBe('text-body-md text-primary');
  });
});
