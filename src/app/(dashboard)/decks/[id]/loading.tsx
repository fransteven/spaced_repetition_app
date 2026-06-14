export default function DeckDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Back link + Header skeleton */}
      <header className="max-w-7xl mx-auto mb-10 space-y-4">
        <div className="h-4 w-24 bg-surface-container-low rounded animate-pulse" />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3 w-full md:max-w-lg">
            <div className="h-6 w-24 bg-surface-container-low rounded-full animate-pulse" />
            <div className="h-12 w-3/4 bg-surface-container-high rounded animate-pulse" />
            <div className="h-5 w-full bg-surface-container-low rounded animate-pulse" />
          </div>
          <div className="h-5 w-24 bg-surface-container-low rounded animate-pulse" />
        </div>
      </header>

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div className="h-5 w-24 bg-surface-container-low rounded" />
        <div className="h-10 w-28 bg-surface-container-high rounded-lg" />
      </div>

      {/* Cards list skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/5 flex flex-col gap-5 hover:shadow-[0px_12px_32px_rgba(25,28,29,0.04)] shadow-[0px_12px_32px_rgba(25,28,29,0.02)] animate-pulse"
          >
            <div className="flex justify-between items-start">
              <div className="h-6 w-16 bg-surface-container-low rounded-full" />
              <div className="h-8 w-16 bg-surface-container-low/50 rounded-lg" />
            </div>

            <div className="space-y-1.5">
              <div className="h-3 w-12 bg-surface-container-low rounded" />
              <div className="h-5 w-full bg-surface-container-high rounded" />
              <div className="h-5 w-2/3 bg-surface-container-high rounded" />
            </div>

            <div className="h-px bg-surface-container-high" />

            <div className="space-y-1.5">
              <div className="h-3 w-12 bg-surface-container-low rounded" />
              <div className="h-5 w-full bg-surface-container-low rounded" />
              <div className="h-5 w-3/4 bg-surface-container-low rounded" />
            </div>

            <div className="flex gap-2 pt-2">
              <div className="h-4.5 w-16 bg-surface-container-low rounded-full" />
              <div className="h-4.5 w-12 bg-surface-container-low rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
