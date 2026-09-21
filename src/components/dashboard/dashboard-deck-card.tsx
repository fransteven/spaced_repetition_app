import React from "react"
import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import { Surface } from "@/components/primitives/surface"
import { Pill } from "@/components/primitives/pill"
import { MasteryThread } from "@/components/primitives/mastery-thread"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface DashboardDeck {
  deckId: string
  icon: LucideIcon
  title: string
  category: string
  mastery: number
  due: number
  iconBg: string
  iconColor: string
}

export function DashboardDeckCard({
  deckId,
  icon: Icon,
  title,
  category,
  mastery,
  due,
  iconBg,
  iconColor,
}: DashboardDeck) {
  const hasDue = due > 0

  return (
    <Surface
      tone="card"
      interactive
      className="min-w-[280px] sm:min-w-[320px] p-5 sm:p-6 flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-5">
          <div className={`size-11 ${iconBg} rounded-xl flex items-center justify-center ${iconColor}`}>
            <Icon className="size-5" />
          </div>
          <Pill tone={hasDue ? "struggling" : "neutral"} size="sm">
            {hasDue ? `${due} due` : "0 due"}
          </Pill>
        </div>

        <h3 className="text-headline-sm text-on-surface mb-1 line-clamp-1">{title}</h3>
        <p className="text-body-sm text-on-surface-variant capitalize mb-6">{category}</p>

        <div className="mb-6">
          <div className="flex justify-between text-label-sm font-semibold text-on-surface-variant mb-2">
            <span>Mastery</span>
            <span className="tabular">{mastery}%</span>
          </div>
          <MasteryThread value={mastery} />
        </div>
      </div>

      <Link
        href={`/study/${deckId}`}
        className={cn(
          buttonVariants({ variant: hasDue ? "default" : "outline", size: "lg" }),
          "w-full"
        )}
      >
        Study now
      </Link>
    </Surface>
  )
}
