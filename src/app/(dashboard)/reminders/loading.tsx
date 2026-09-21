import { PageHeader, PageSection } from "@/components/layout/page-header"
import { Surface } from "@/components/primitives/surface"
import { Skeleton } from "@/components/ui/skeleton"

export default function RemindersLoading() {
  return (
    <>
      <PageHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 rounded-md" />
          <Skeleton className="h-5 w-80 rounded" />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Skeleton className="h-10 w-full sm:w-56 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </PageHeader>

      <PageSection>
        {/* Program cards grid skeleton matching lg:grid-cols-2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Surface
              key={i}
              tone="card"
              className="flex flex-col gap-5 p-5 sm:p-6"
            >
              {/* Card header */}
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-2/3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-40 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
                <Skeleton className="size-8 rounded-full" />
              </div>

              {/* Buckets skeleton */}
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <Surface
                    key={j}
                    tone="panel"
                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <Skeleton className="h-4 w-28 rounded" />
                  </Surface>
                ))}
              </div>

              {/* Upcoming sessions skeleton */}
              <div className="space-y-2 pt-1">
                <Skeleton className="h-4 w-28 rounded" />
                <div className="flex gap-2 flex-wrap">
                  {[1, 2].map((j) => (
                    <Skeleton key={j} className="h-9 w-28 rounded-lg" />
                  ))}
                </div>
              </div>
            </Surface>
          ))}
        </div>
      </PageSection>
    </>
  )
}
