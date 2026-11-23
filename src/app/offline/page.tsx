import type { Metadata } from 'next';

import { PageHeader, PageSection } from '@/components/layout/page-header';
import { DownloadsManager, OnlineAppLinks } from '@/components/offline/downloads-manager';
import { OfflineBanner } from '@/components/offline/offline-banner';
import { OfflineFrame } from '@/components/offline/offline-frame';

export const metadata: Metadata = {
  title: 'Downloads',
  description: 'Books and decks downloaded to this device for offline use.',
};

// Static shell: no server data, no auth. The downloads list is client-only (IndexedDB/OPFS).
export default function OfflineDownloadsPage(): React.JSX.Element {
  return (
    <OfflineFrame>
      <OfflineBanner />
      <PageHeader>
        <h1 className="mb-2 text-display-lg text-on-surface">Downloads</h1>
        <p className="max-w-lg text-body-lg text-on-surface-variant">
          Books and decks saved on this device. They open without a connection and sync when you are back online.
        </p>
        <OnlineAppLinks className="mt-6" />
      </PageHeader>
      <PageSection data-slot="offline-downloads">
        <DownloadsManager />
      </PageSection>
    </OfflineFrame>
  );
}
