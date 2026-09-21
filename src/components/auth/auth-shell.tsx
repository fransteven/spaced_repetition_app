import React from "react"
import { AppLogo } from "@/components/primitives/app-logo"
import { Surface } from "@/components/primitives/surface"
import { Sparkles, Brain, Clock } from "lucide-react"

interface AuthShellProps {
  children: React.ReactNode
  title: string
  subtitle: string
  footerPrompt: React.ReactNode
  valueProposition?: string
  showOnboardingSteps?: boolean
}

export function AuthShell({
  children,
  title,
  subtitle,
  footerPrompt,
  valueProposition = "Master anything with evidence-based spaced repetition",
  showOnboardingSteps = false,
}: AuthShellProps): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-surface text-on-surface">
      <main className="flex w-full flex-grow flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex w-full max-w-sm flex-col items-center gap-6">
          {/* App Logo */}
          <div className="flex flex-col items-center">
            <AppLogo size="lg" href="/" />
          </div>

          {/* Form Card */}
          <Surface
            tone="panel"
            className="w-full rounded-2xl p-6 sm:p-8"
          >
            <header className="mb-6 text-center">
              <h1 className="font-display text-display-sm text-on-surface tracking-tight">
                {title}
              </h1>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {subtitle}
              </p>
            </header>

            {children}

            <div className="mt-6 pt-1 text-center">
              {footerPrompt}
            </div>
          </Surface>

          {/* Value proposition line */}
          <p className="text-center text-body-sm text-on-surface-variant max-w-xs">
            {valueProposition}
          </p>

          {/* Optional Onboarding Steps for Registration */}
          {showOnboardingSteps && (
            <div className="flex w-full max-w-sm items-center justify-between gap-2 px-2 text-center">
              <div className="flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-surface-container-low p-2.5">
                <Sparkles className="size-4 text-primary" />
                <span className="text-label-sm font-semibold text-on-surface">1. Create</span>
                <span className="text-label-sm text-on-surface-variant">Custom decks</span>
              </div>
              <div className="flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-surface-container-low p-2.5">
                <Brain className="size-4 text-state-intermediate" />
                <span className="text-label-sm font-semibold text-on-surface">2. Review</span>
                <span className="text-label-sm text-on-surface-variant">FSRS 4.5 engine</span>
              </div>
              <div className="flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-surface-container-low p-2.5">
                <Clock className="size-4 text-state-mastered" />
                <span className="text-label-sm font-semibold text-on-surface">3. Retain</span>
                <span className="text-label-sm text-on-surface-variant">Long-term memory</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Global footer */}
      <footer className="w-full bg-surface-container-low py-8 text-center text-on-surface-variant">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 px-4">
          <p className="text-body-sm font-bold text-on-surface">NeuroCards</p>
          <p className="text-label-sm uppercase tracking-wider text-on-surface-variant/80">
            © 2026 NeuroCards. Designed for calm and rewarded learning.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-label-sm">
            <span className="text-on-surface-variant/70">Evidence-Based SRS</span>
            <span>·</span>
            <span className="text-on-surface-variant/70">FSRS 4.5</span>
            <span>·</span>
            <span className="text-on-surface-variant/70">Privacy First</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
