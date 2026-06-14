export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 mb-16">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest p-6 md:p-8 rounded-xl ring-1 ring-outline-variant/10 shadow-[0px_12px_32px_rgba(25,28,29,0.02)] flex flex-col gap-3"
          >
            <div className="h-12 w-16 bg-surface-container-high rounded-lg animate-pulse" />
            <div className="h-6 w-32 bg-surface-container-low rounded animate-pulse" />
            <div className="h-4 w-24 bg-surface-container-low/65 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Your Decks skeleton */}
      <section className="mb-16">
        <div className="flex justify-between items-end mb-8">
          <div className="space-y-2">
            <div className="h-9 w-48 bg-surface-container-high rounded animate-pulse" />
            <div className="h-4 w-64 bg-surface-container-low rounded animate-pulse" />
          </div>
          <div className="h-5 w-28 bg-surface-container-low rounded animate-pulse" />
        </div>

        <div className="flex overflow-x-auto gap-6 md:gap-8 pb-4 no-scrollbar -mx-2 px-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="min-w-[320px] sm:min-w-[360px] bg-surface-container-lowest p-6 rounded-xl ring-1 ring-outline-variant/10 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-surface-container-high rounded-lg animate-pulse" />
                <div className="h-6 w-16 bg-surface-container-low rounded-full animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-3/4 bg-surface-container-high rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-surface-container-low rounded animate-pulse" />
              </div>
              <div className="space-y-2 mt-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-16 bg-surface-container-low rounded animate-pulse" />
                  <div className="h-3.5 w-8 bg-surface-container-low rounded animate-pulse" />
                </div>
                <div className="h-1 w-full bg-surface-container-low rounded-full animate-pulse" />
              </div>
              <div className="h-10 w-full bg-surface-container-high rounded-lg animate-pulse mt-4" />
            </div>
          ))}
        </div>
      </section>

      {/* Grid columns skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Activity skeleton */}
        <section className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-surface-container-high rounded animate-pulse" />
            <div className="h-4 w-48 bg-surface-container-low rounded animate-pulse" />
          </div>
          <div className="h-48 w-full bg-surface-container-lowest rounded-xl border border-outline-variant/5 animate-pulse" />
        </section>

        {/* Timeline skeleton */}
        <section className="lg:col-span-1 space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-surface-container-high rounded animate-pulse" />
            <div className="h-4 w-48 bg-surface-container-low rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container-low rounded-lg animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-4.5 w-24 bg-surface-container-high rounded animate-pulse" />
                    <div className="h-3.5 w-16 bg-surface-container-low rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-12 bg-surface-container-low rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
