import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Metadata pill — DESIGN.md §3 (label scale) and §2 (no borders, tonal fills).
 * Replaces the hand-rolled `text-[10px] font-bold tracking-widest uppercase`
 * strings that were duplicated across decks, cards and study.
 */
const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full uppercase whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-container-low text-on-surface-variant",
        primary: "bg-primary/10 text-primary",
        secondary: "bg-secondary/10 text-secondary",
        tertiary: "bg-tertiary/10 text-tertiary",
        error: "bg-error/10 text-error",
        new: "bg-state-new-container text-on-state-new-container",
        struggling: "bg-state-struggling-container text-on-state-struggling-container",
        intermediate: "bg-state-intermediate-container text-on-state-intermediate-container",
        mastered: "bg-state-mastered-container text-on-state-mastered-container",
        streak: "bg-streak-container text-on-streak-container",
        outline: "border border-outline-variant/30 text-on-surface-variant",
      },
      size: {
        sm: "px-2 py-0.5 text-label-sm",
        md: "px-3 py-1 text-label-md",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "sm",
    },
  }
)

export function Pill({
  tone,
  size,
  className,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof pillVariants>): React.ReactElement {
  return (
    <span data-slot="pill" className={cn(pillVariants({ tone, size }), className)} {...props} />
  )
}

export { pillVariants }
