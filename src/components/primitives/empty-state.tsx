import React from "react"
import { Surface } from "@/components/primitives/surface"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  body: string | React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <Surface
      tone="panel"
      className={cn(
        "flex w-full flex-col items-center justify-center px-6 py-16 sm:py-24 text-center",
        className
      )}
    >
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-surface-container-highest text-primary [&_svg]:size-9">
        {icon}
      </div>
      <h3 className="mb-3 text-display-sm text-on-surface">{title}</h3>
      <div className="max-w-md text-body-md text-on-surface-variant leading-relaxed">
        {body}
      </div>
      {action && <div className="mt-6 flex items-center justify-center gap-3">{action}</div>}
    </Surface>
  )
}
