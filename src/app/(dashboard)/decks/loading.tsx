export default function DecksLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header skeleton */}
      <header className="max-w-7xl mx-auto mb-10 space-y-3">
        <div className="h-12 w-48 bg-surface-container-high rounded animate-pulse" />
        <div className="h-5 w-96 bg-surface-container-low rounded animate-pulse" />
      </header>

      {/* Filter and search bar skeleton */}
      <section className="bg-surface-container-low p-2 rounded-xl flex flex-col sm:flex-row items-center gap-3 w-full animate-pulse">
        <div className="flex gap-2 w-full sm:w-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-20 bg-surface-container-high rounded-lg" />
          ))}
        </div>
        <div className="h-10 w-full sm:w-64 bg-surface-container-lowest rounded-lg sm:ml-auto" />
        <div className="h-10 w-full sm:w-32 bg-surface-container-high rounded-lg" />
      </section>

      {/* Decks grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/5 flex flex-col justify-between min-h-[280px] shadow-[0px_12px_32px_rgba(25,28,29,0.02)] animate-pulse"
          >
            <div>
              <div className="mb-4 flex items-start justify-between">
                <div className="h-6 w-20 bg-surface-container-low rounded-full" />
                <div className="h-8 w-8 bg-surface-container-low rounded-full" />
              </div>
              <div className="h-7 w-3/4 bg-surface-container-high rounded mb-2" />
              <div className="h-4 w-1/3 bg-surface-container-low rounded mb-6" />

              <div className="space-y-4 mb-8">
                <div>
                  <div className="flex justify-between mb-2">
                    <div className="h-3 w-20 bg-surface-container-low rounded" />
                    <div className="h-3 w-8 bg-surface-container-low rounded" />
                  </div>
                  <div className="h-1 w-full bg-surface-container-low rounded-full" />
                </div>
                <div className="flex gap-4">
                  <div className="h-3 w-8 bg-surface-container-low rounded-full" />
                  <div className="h-3 w-8 bg-surface-container-low rounded-full" />
                  <div className="h-3 w-8 bg-surface-container-low rounded-full" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-outline-variant/5">
              <div className="h-4 w-32 bg-surface-container-low rounded" />
              <div className="h-10 w-28 bg-surface-container-high rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
