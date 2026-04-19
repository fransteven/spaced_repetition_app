"use client"

export function EmptyDeckCard() {
  return (
    <div className="border-2 border-dashed border-outline-variant bg-surface-container-low/30 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[280px] hover:bg-surface-container-low transition-all group cursor-pointer">
      <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-primary text-3xl">post_add</span>
      </div>
      <h3 className="text-lg font-bold text-on-surface mb-2">Create your first deck</h3>
      <p className="text-sm text-on-surface-variant max-w-[200px] mb-6">
        Start your learning journey by building a customized intellectual stack.
      </p>
      <button className="text-primary font-bold text-sm flex items-center gap-2">
        <span className="material-symbols-outlined text-base">add</span>
        Get started
      </button>
    </div>
  )
}
