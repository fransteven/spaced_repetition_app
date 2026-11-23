import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Offline', template: '%s — NeuroCards' },
  description: 'Books and decks downloaded to this device.',
  robots: { index: false, follow: false },
};

/**
 * Offline shells (docs/plans/offline-mode.md). Lives outside the (dashboard) route group on purpose:
 * that layout queries the database. Everything below renders statically and reads from IndexedDB/OPFS
 * on the client; the service worker precaches these pages at install time.
 * No wrapper here: /offline/read and /offline/study render full-screen <main> elements of their own,
 * so the padded page chrome lives in /offline/page.tsx.
 */
export default function OfflineLayout({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return <>{children}</>;
}
