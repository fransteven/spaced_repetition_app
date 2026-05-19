export interface Bucket {
  icon: string
  name: string
  cards: number
  interval: string
  next: string
  borderColor: string
  iconColor: string
}

export function BucketRow({ bucket }: { bucket: Bucket }) {
  return (
    <div className={`flex items-center gap-4 py-3 px-4 border-l-[3px] bg-surface-container-low rounded-r-lg ${bucket.borderColor}`}>
      <span className={`material-symbols-outlined text-xl ${bucket.iconColor}`}>{bucket.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-on-surface">{bucket.name}</p>
          <span className="text-sm font-bold text-on-surface">{bucket.cards} cards</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-on-surface-variant">{bucket.interval}</p>
          <p className="text-xs text-on-surface-variant">Next: {bucket.next}</p>
        </div>
      </div>
    </div>
  )
}
