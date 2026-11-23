import type { Metadata } from 'next';
import { Suspense } from 'react';

import { OfflineStudyShell } from './offline-study-shell';

export const metadata: Metadata = {
  title: 'Studying offline',
  description: 'Study a downloaded deck without a connection.',
};


export default function OfflineStudyPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <OfflineStudyShell />
    </Suspense>
  );
}
