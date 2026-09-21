import { PageHeader, PageSection } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/primitives/surface';

// Wrappers match decks/[id]/page.tsx exactly to avoid hydration layout shifts.
export default function DeckDetailLoading() {
  return (
    <>
      <PageHeader>
        <Skeleton className="mb-4 h-4 w-24 rounded" />

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="w-full space-y-3 md:max-w-lg">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-12 w-3/4 rounded" />
            <Skeleton className="h-6 w-full rounded" />
          </div>
          <div className="flex w-full flex-col gap-4 md:w-auto md:min-w-[280px] md:max-w-xs">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3 w-8 rounded" />
              </div>
              <Skeleton className="h-0.5 w-full rounded-full" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </PageHeader>

      <PageSection className="space-y-8">
        {/* Compact stats row skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Surface key={i} tone="stat" className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-10 w-16 rounded my-1" />
              <Skeleton className="h-3.5 w-32 rounded" />
            </Surface>
          ))}
        </div>

        {/* Card list skeleton */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>

          <div className="flex flex-col flex-wrap items-center gap-3 rounded-2xl bg-surface-container-low p-2.5 sm:flex-row">
            <div className="flex w-full gap-1.5 sm:w-auto">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-7 w-16 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-9 w-full rounded-lg sm:ml-auto sm:w-64" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Surface key={i} ghost className="flex flex-col gap-5 p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>

                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-12 rounded" />
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-2/3 rounded" />
                </div>

                <div className="-mx-1 space-y-1.5 rounded-sm bg-surface-container-low/60 px-3 py-2">
                  <Skeleton className="h-3 w-12 rounded" />
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-3/4 rounded" />
                </div>

                <div className="flex gap-2">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              </Surface>
            ))}
          </div>
        </div>
      </PageSection>
    </>
  );
}
