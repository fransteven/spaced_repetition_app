export default function RemindersLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header skeleton */}
      <header className="max-w-7xl mx-auto mb-10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3 w-full md:max-w-lg">
            <div className="h-12 w-64 bg-surface-container-high rounded animate-pulse" />
            <div className="h-5 w-full bg-surface-container-low rounded animate-pulse" />
          </div>
          <div className="h-11 w-32 bg-surface-container-high rounded-lg animate-pulse" />
        </div>
      </header>

      {/* Program cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/15 flex flex-col gap-6 shadow-[0px_12px_32px_rgba(25,28,29,0.02)] animate-pulse"
          >
            {/* Card header */}
            <div className="flex justify-between items-start">
              <div className="space-y-2.5 w-2/3">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-40 bg-surface-container-high rounded" />
                  <div className="h-5.5 w-16 bg-surface-container-low rounded-full" />
                </div>
                <div className="h-4 w-32 bg-surface-container-low rounded" />
              </div>
              <div className="h-8 w-8 bg-surface-container-low rounded-full" />
            </div>

            {/* Buckets skeleton */}
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-14 w-full bg-surface-container-low rounded-lg" />
              ))}
            </div>

            {/* Upcoming sessions skeleton */}
            <div className="space-y-3">
              <div className="h-4 w-28 bg-surface-container-high rounded" />
              <div className="flex gap-3 flex-wrap">
                {[1, 2].map((j) => (
                  <div key={j} className="h-10 w-24 bg-surface-container-low rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
