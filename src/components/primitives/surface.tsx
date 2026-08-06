import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The single card/panel contract for the app — DESIGN.md §4 and §5.
 *
 * `card` uses `bg-card` rather than `surface-container-lowest` on purpose: in
 * dark mode `surface-container-lowest` (#141617) sits *below* `surface`
 * (#191c1d), so cards would sink instead of lift. `card` is #ffffff / #2e3132,
 * correct in both themes.
 */
const surfaceVariants = cva("", {
  variants: {
    tone: {
      card: "bg-card rounded-md",
      panel: "bg-surface-container-low rounded-lg",
      canvas: "bg-surface rounded-lg",
    },
    /** Ghost Border — outline-variant at 15%, felt rather than seen (§4). */
    ghost: {
      true: "border border-outline-variant/15",
      false: "",
    },
    interactive: {
      true: "transition-[box-shadow,background-color] duration-200",
      false: "",
    },
  },
  compoundVariants: [
    // Static panels avoid shadows entirely (§4 "Tonal Layering").
    { tone: "card", class: "shadow-ambient" },
    {
      tone: "card",
      interactive: true,
      class: "hover:shadow-ambient-lg hover:bg-surface-bright",
    },
    {
      tone: "panel",
      interactive: true,
      class: "hover:bg-surface-container",
    },
  ],
  defaultVariants: { tone: "card", ghost: false, interactive: false },
})

type SurfaceProps<T extends React.ElementType> = {
  as?: T
} & VariantProps<typeof surfaceVariants> &
  Omit<React.ComponentPropsWithoutRef<T>, "as" | "tone">

export function Surface<T extends React.ElementType = "div">({
  as,
  tone,
  ghost,
  interactive,
  className,
  ...props
}: SurfaceProps<T>): React.ReactElement {
  const Component = as ?? "div"
  return (
    <Component
      data-slot="surface"
      className={cn(surfaceVariants({ tone, ghost, interactive }), className)}
      {...props}
    />
  )
}

export { surfaceVariants }
