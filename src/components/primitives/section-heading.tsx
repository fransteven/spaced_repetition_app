import React from "react"
import { cn } from "@/lib/utils"

export interface SectionHeadingProps {
  title: string | React.ReactNode
  description?: string | React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: SectionHeadingProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8",
        className
      )}
    >
      <div>
        <h2 className="text-headline-md text-on-surface tracking-tight">
          {title}
        </h2>
        {description && (
          <div className="text-body-sm text-on-surface-variant mt-1">
            {description}
          </div>
        )}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  )
}
