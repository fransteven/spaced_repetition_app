import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Metadata pill — DESIGN.md §3 (label scale) and §2 (no borders, tonal fills).
 * Replaces the hand-rolled `text-[10px] font-bold tracking-widest uppercase`
 * strings that were duplicated across decks, cards and study.
 */
const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm uppercase whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-container-low text-on-surface-variant",
        primary: "bg-primary/10 text-primary",
        secondary: "bg-secondary/10 text-secondary",
        tertiary: "bg-tertiary/10 text-tertiary",
        error: "bg-error/10 text-error",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

export function Pill({
  tone,
  className,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof pillVariants>): React.ReactElement {
  return (
    <span data-slot="pill" className={cn(pillVariants({ tone }), className)} {...props} />
  )
}

export { pillVariants }
