"use client"

import { AlertTriangle } from "lucide-react"
import type { JSX } from "react"
import { EmptyState } from "@/components/primitives/empty-state"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): JSX.Element {
  return (
    <html lang="en">
      <body className="bg-surface text-on-surface flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <EmptyState
            icon={<AlertTriangle className="size-9 text-error" />}
            title="Something went wrong"
            body="An unexpected error occurred while processing your request. You can safely try again."
            action={
              <Button onClick={() => reset()} size="lg">
                Try again
              </Button>
            }
          />
        </div>
      </body>
    </html>
  )
}
