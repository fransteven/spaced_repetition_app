import { CONTENT_PADDING } from '@/components/layout/nav-config';
import { cn } from '@/lib/utils';

/**
 * Padded page chrome for the offline shells (downloads list, empty and loading states).
 * Full-screen views (<Reader>, <StudySession>) render their own <main> and skip it.
 */
export function OfflineFrame({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <main className={cn('flex min-h-screen flex-1 flex-col bg-background text-on-surface', CONTENT_PADDING)}>
      <div className="flex-1 pt-10 pb-24 sm:pt-12 lg:pb-12">{children}</div>
    </main>
  );
}
