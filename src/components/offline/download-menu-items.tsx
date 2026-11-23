'use client';

import { CircleX, Download, RefreshCw, X } from 'lucide-react';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { UseDownloadResult } from '@/components/offline/use-download';

interface DownloadMenuItemsProps {
  download: UseDownloadResult;
  /** Label of the download action, e.g. "Download for offline" / "Download deck". */
  downloadLabel: string;
}

/** Dropdown items for a book's / deck's offline copy: download, cancel (with %), update, remove. */
export function DownloadMenuItems({ download, downloadLabel }: DownloadMenuItemsProps): React.JSX.Element {
  const { status, progress, canDownload, online } = download;

  if (status === 'downloading') {
    return (
      <DropdownMenuItem onClick={download.cancel}>
        <X />
        <span className="flex-1">Cancel download</span>
        {progress !== null && <span className="tabular text-on-surface-variant">{progress}%</span>}
      </DropdownMenuItem>
    );
  }

  if (status === 'downloaded') {
    return (
      <>
        <DropdownMenuItem onClick={download.download} disabled={!canDownload}>
          <RefreshCw />
          Update download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={download.remove}>
          <CircleX />
          Remove download
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <DropdownMenuItem onClick={download.download} disabled={!canDownload || status === 'unknown'}>
      <Download />
      <span className="flex-1">{status === 'error' ? 'Retry download' : downloadLabel}</span>
      {!online && <span className="text-on-surface-variant">Offline</span>}
    </DropdownMenuItem>
  );
}
