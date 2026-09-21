import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Surface } from "@/components/primitives/surface"

export default function StudyLoading(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      {/* Nav Skeleton */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>

          <Skeleton className="h-6 w-36 rounded-md" />

          <Skeleton className="h-4 w-12 rounded" />
        </div>

        {/* 2px thread placeholder */}
        <div className="h-[2px] w-full bg-surface-container-high" />
      </nav>

      {/* Main Study Card Skeleton */}
      <main className="flex flex-grow flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <Surface
          tone="card"
          className="flex min-h-[400px] w-full max-w-[60ch] flex-col justify-between p-6 sm:p-8"
        >
          {/* Card Top Pill */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="size-8 rounded-lg" />
          </div>

          {/* Prompt Skeleton */}
          <div className="my-auto space-y-3 text-center">
            <Skeleton className="mx-auto h-7 w-4/5 rounded-md" />
            <Skeleton className="mx-auto h-6 w-3/5 rounded-md" />
          </div>

          {/* Reveal button placeholder */}
          <Skeleton className="h-11 w-full rounded-xl" />
        </Surface>
      </main>

      {/* Footer Skeleton */}
      <footer className="px-4 sm:px-8 pt-4 pb-10">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      </footer>
    </div>
  )
}
