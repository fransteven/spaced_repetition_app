import { PageHeader, PageSection } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/primitives/surface';

// Wrappers match decks/page.tsx exactly to prevent layout shift on hydration.
export default function DecksLoading() {
  return (
    <>
      <PageHeader className="space-y-3">
        <Skeleton className="h-14 w-64 rounded-lg" />
        <Skeleton className="h-6 w-96 max-w-full rounded" />
      </PageHeader>

      <PageSection className="mb-8 flex flex-col flex-wrap items-center gap-3 rounded-2xl bg-surface-container-low p-2.5 sm:flex-row">
        <div className="flex w-full gap-2 sm:w-auto">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-lg sm:ml-auto sm:w-48 md:w-64" />
        <Skeleton className="h-9 w-full rounded-lg sm:w-28" />
      </PageSection>

      <PageSection className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Surface key={i} ghost className="flex min-h-[280px] flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="mb-4 flex items-start justify-between">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="size-7 rounded-full" />
              </div>
              <Skeleton className="mb-2 h-7 w-3/4 rounded" />
              <Skeleton className="mb-3 h-4 w-full rounded" />
              <Skeleton className="mb-6 h-4 w-1/3 rounded" />

              <div className="mb-8 space-y-4">
                <div>
                  <div className="mb-2 flex justify-between">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-3 w-8 rounded" />
                  </div>
                  <Skeleton className="h-0.5 w-full rounded-full" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-16 rounded-full" />
                  <Skeleton className="h-3 w-20 rounded-full" />
                  <Skeleton className="h-3 w-20 rounded-full" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </Surface>
        ))}
      </PageSection>
    </>
  );
}
