import type { Metadata } from 'next';
import { Suspense } from 'react';

import { OfflineReadShell } from './offline-read-shell';

export const metadata: Metadata = {
  title: 'Reading offline',
  description: 'Read a downloaded book without a connection.',
};


export default function OfflineReadPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <OfflineReadShell />
    </Suspense>
  );
}
