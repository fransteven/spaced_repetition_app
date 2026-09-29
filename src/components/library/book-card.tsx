'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, MoreHorizontal, Trash2 } from 'lucide-react';

import type { LibraryBook } from '@/lib/services/book-service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pill } from '@/components/primitives/pill';
import { Surface } from '@/components/primitives/surface';
import { MasteryThread } from '@/components/primitives/mastery-thread';

interface BookCardProps {
  book: LibraryBook;
  index: number;
  onDelete: () => void;
}

export function BookCard({ book, index, onDelete }: BookCardProps): React.JSX.Element {
  const percent = Math.round(book.progress * 100);
  const ready = book.status === 'ready';

  const cover = (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface-container-high">
      {ready && book.has_cover ? (
        <Image
          src={`/api/books/${book.id}/cover`}
          alt=""
          fill
          unoptimized
          sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
          <BookOpen className="size-8 text-on-surface-variant" />
          <span className="line-clamp-4 text-body-lg font-semibold text-on-surface">{book.title}</span>
        </div>
      )}
    </div>
  );

  return (
    <Surface
      ghost
      interactive={ready}
      className="group relative flex animate-rise-in flex-col gap-3 p-3 sm:p-4"
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      {ready ? (
        <Link href={`/read/${book.id}`} aria-label={`Read ${book.title}`} className="rounded-lg">
          {cover}
        </Link>
      ) : (
        <div className={cn(book.status === 'processing' && 'opacity-60')}>{cover}</div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-body-md font-semibold text-on-surface">{book.title}</h3>
          {book.author && (
            <p className="truncate text-body-sm text-on-surface-variant">{book.author}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label={`Options for ${book.title}`} className="-mr-1 shrink-0" />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {book.status === 'processing' && <Pill tone="neutral">Processing…</Pill>}
      {book.status === 'failed' && (
        <div className="space-y-1">
          <Pill tone="error">Failed</Pill>
          {book.error && <p className="text-body-sm text-on-surface-variant">{book.error}</p>}
        </div>
      )}
      {ready && (
        <div className="mt-auto space-y-1.5">
          <MasteryThread value={percent} tone="primary" animate={false} />
          <p className="text-label-sm tabular text-on-surface-variant">
            {percent === 0 ? 'Not started' : `${percent}% read`}
          </p>
        </div>
      )}
    </Surface>
  );
}
