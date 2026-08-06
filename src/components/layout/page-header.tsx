import { cn } from "@/lib/utils"

/**
 * Shared page wrappers. Pages and their `loading.tsx` skeletons must use these
 * same wrappers — hand-rolled ones drifted apart and caused a visible jump on
 * hydration.
 */
export function PageHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("mx-auto mb-10 max-w-7xl", className)} {...props} />
}

export function PageSection({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto max-w-7xl", className)} {...props} />
}
