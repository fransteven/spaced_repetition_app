import { PageSection } from '@/components/layout/page-header';
import { Surface } from '@/components/primitives/surface';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <PageSection className="space-y-10 sm:space-y-12">
      {/* ── 1. Hero Skeleton ───────────────────────────────── */}
      <div className="bg-surface-container-low rounded-2xl p-6 sm:p-8 lg:p-10 shadow-ambient flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 space-y-4 w-full">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-10 w-3/4 max-w-md rounded-lg" />
          <Skeleton className="h-4 w-full max-w-lg rounded" />
          <Skeleton className="h-4 w-4/5 max-w-md rounded" />
          <div className="pt-2 flex items-center gap-4">
            <Skeleton className="h-12 w-48 rounded-lg" />
            <Skeleton className="h-12 w-32 rounded-lg" />
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-center justify-center">
          <Skeleton className="size-36 sm:size-40 rounded-full" />
          <Skeleton className="h-4 w-28 mt-2 rounded" />
        </div>
      </div>

      {/* ── 2. Stat Cards Skeleton ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3].map((i) => (
          <Surface key={i} tone="stat" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="size-4 rounded" />
            </div>
            <Skeleton className="h-10 w-20 rounded my-1" />
            <Skeleton className="h-3.5 w-36 rounded" />
          </Surface>
        ))}
      </div>

      {/* ── 3. Decks Carousel Skeleton ──────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36 rounded" />
            <Skeleton className="h-4 w-52 rounded" />
          </div>
          <Skeleton className="h-4 w-24 rounded" />
        </div>

        <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 no-scrollbar">
          {[1, 2, 3].map((i) => (
            <Surface
              key={i}
              tone="card"
              className="min-w-[280px] sm:min-w-[320px] p-5 sm:p-6 flex flex-col justify-between h-64"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <Skeleton className="size-11 rounded-xl" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-3.5 w-1/3 rounded" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-14 rounded" />
                    <Skeleton className="h-3 w-8 rounded" />
                  </div>
                  <Skeleton className="h-0.5 w-full rounded-full" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
            </Surface>
          ))}
        </div>
      </section>

      {/* ── 4. Activity & Timeline Skeletons ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        <section className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-28 rounded" />
            <Skeleton className="h-4 w-44 rounded" />
          </div>
          <div className="bg-surface-container-low p-6 sm:p-8 rounded-2xl h-56 flex flex-col justify-between">
            <Skeleton className="h-4 w-48 rounded" />
            <div className="flex gap-2 justify-center py-4">
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
            <Skeleton className="h-4 w-40 rounded" />
          </div>
        </section>

        <section className="lg:col-span-1 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
          </div>
          <div className="bg-surface-container-low p-6 sm:p-8 rounded-2xl space-y-4 h-56">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-1.5 pl-4 border-l border-outline-variant/30">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageSection>
  );
}
