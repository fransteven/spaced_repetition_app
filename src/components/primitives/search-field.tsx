'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface SearchFieldProps extends Pick<
  React.ComponentProps<'input'>,
  'role' | 'aria-label' | 'aria-controls' | 'aria-expanded' | 'aria-activedescendant' | 'aria-autocomplete'
> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  inputRef?: React.Ref<HTMLInputElement>;
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  autoFocus,
  onKeyDown,
  inputRef,
  ...accessibilityProps
}: SearchFieldProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex w-full items-center rounded-lg bg-card transition-all',
        'focus-within:ring-2 focus-within:ring-primary/20',
        className
      )}
    >
      <Search className="ml-3 h-4 w-4 shrink-0 text-outline" />
      <Input
        {...accessibilityProps}
        aria-label={accessibilityProps['aria-label'] ?? placeholder}
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        className="h-11 w-full border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {value ? (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="mr-1 size-11 text-outline hover:text-on-surface"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
