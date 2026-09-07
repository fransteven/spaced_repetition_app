'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface SearchFieldProps {
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
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        className="h-9 w-full border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="mr-3 flex items-center justify-center text-outline transition-colors hover:text-on-surface cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
