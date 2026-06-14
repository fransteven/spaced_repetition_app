import { ArrowDownRight, BarChart2, CheckCheck, HelpCircle } from "lucide-react"

export interface Bucket {
  icon: string
  name: string
  cards: number
  interval: string
  next: string
  borderColor: string
  iconColor: string
}

const BUCKET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trending_down: ArrowDownRight,
  bar_chart: BarChart2,
  done_all: CheckCheck,
  help: HelpCircle
}

export function BucketRow({ bucket }: { bucket: Bucket }) {
  const Icon = BUCKET_ICONS[bucket.icon] ?? HelpCircle
  return (
    <div className={`flex items-center gap-4 py-3 px-4 border-l-[3px] bg-surface-container-low rounded-r-lg ${bucket.borderColor}`}>
      <Icon className={`h-5 w-5 ${bucket.iconColor}`} />
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
