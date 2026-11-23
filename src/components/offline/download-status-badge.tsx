import { CircleAlert, CircleCheck, Download } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Pill } from '@/components/primitives/pill';
import type { DownloadStatus } from '@/components/offline/use-download';

interface DownloadStatusBadgeProps {
  status: DownloadStatus;
  progress: number | null;
  className?: string;
}

/** Compact offline state of a book or deck. Renders nothing when not downloaded. */
export function DownloadStatusBadge({ status, progress, className }: DownloadStatusBadgeProps): React.ReactElement | null {
  if (status === 'downloaded') {
    return (
      <Pill tone="primary" className={className}>
        <CircleCheck aria-hidden className="size-3" />
        Offline
      </Pill>
    );
  }
  if (status === 'downloading') {
    return (
      <Pill tone="neutral" className={cn('tabular', className)} role="status">
        <Download aria-hidden className="size-3" />
        {progress === null ? 'Downloading…' : `Downloading ${progress}%`}
      </Pill>
    );
  }
  if (status === 'error') {
    return (
      <Pill tone="error" className={className}>
        <CircleAlert aria-hidden className="size-3" />
        Download failed
      </Pill>
    );
  }
  return null;
}
