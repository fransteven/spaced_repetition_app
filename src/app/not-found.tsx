import Link from "next/link"
import { Compass } from "lucide-react"
import { EmptyState } from "@/components/primitives/empty-state"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-surface text-on-surface">
      <div className="w-full max-w-lg">
        <EmptyState
          icon={<Compass className="size-9 text-primary" />}
          title="Page not found"
          body="The page or flashcard collection you're looking for doesn't exist or has been moved."
          action={
            <Link href="/" className={buttonVariants({ size: "lg" })}>
              Return to dashboard
            </Link>
          }
        />
      </div>
    </div>
  )
}
