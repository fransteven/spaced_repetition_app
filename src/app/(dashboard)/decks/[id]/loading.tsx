import { PageHeader, PageSection } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/primitives/surface';

// Wrappers must match decks/[id]/page.tsx exactly — see DecksLoading.
export default function DeckDetailLoading() {
  return (
    <>
      <PageHeader>
        <Skeleton className="mb-4 h-4 w-24" />

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="w-full space-y-3 md:max-w-lg">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-full" />
          </div>
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-0.5 w-full rounded-full" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </PageHeader>

      <PageSection>
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Surface key={i} ghost className="flex flex-col gap-5 p-5">
              <div className="flex items-start justify-between">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-lg" />
              </div>

              <div className="space-y-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
              </div>

              <div className="-mx-1 space-y-1.5 rounded-sm bg-surface-container-low/60 px-3 py-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>

              <div className="flex gap-2">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            </Surface>
          ))}
        </div>
      </PageSection>
    </>
  );
}
