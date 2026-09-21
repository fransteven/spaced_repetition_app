"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { ReminderProgramItem } from "@/lib/services/reminder-service"
import {
  Layers,
  MoreVertical,
  Calendar,
  Play,
  Loader2,
} from "lucide-react"

import { Surface } from "@/components/primitives/surface"
import { Pill } from "@/components/primitives/pill"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { DeleteProgramDialog } from "@/components/reminders/delete-program-dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Props {
  program: ReminderProgramItem
}

const BUCKET_TONES: Record<string, "struggling" | "intermediate" | "mastered"> = {
  Struggling: "struggling",
  Intermediate: "intermediate",
  Mastered: "mastered",
}

function BucketRow({
  bucket,
  isActive,
}: {
  bucket: ReminderProgramItem["buckets"][number]
  isActive: boolean
}) {
  const tone = BUCKET_TONES[bucket.name] ?? "intermediate"

  return (
    <Surface
      tone="panel"
      className={cn(
        "flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl",
        !isActive && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3">
        <Pill tone={tone} size="sm">
          {bucket.name}
        </Pill>
        <span className="text-body-sm font-semibold text-on-surface">
          {bucket.cards} {bucket.cards === 1 ? "card" : "cards"}
        </span>
      </div>

      <div className="flex items-center gap-4 text-right">
        <span className="text-label-sm text-on-surface-variant hidden sm:inline">
          Every {bucket.intervalDays} {bucket.intervalDays === 1 ? "day" : "days"}
        </span>
        <span className="text-label-sm text-on-surface-variant font-medium">
          Next: {bucket.next_date_label}
        </span>
      </div>
    </Surface>
  )
}

export function ProgramCard({ program }: Props) {
  const router = useRouter()
  const isActive = program.active
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reminders/${program.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !isActive }),
        })
        if (res.ok) {
          toast.success(isActive ? "Program paused" : "Program resumed")
          router.refresh()
        } else {
          toast.error("Failed to update program status")
        }
      } catch {
        toast.error("Failed to update program status")
      }
    })
  }

  return (
    <>
      <Surface
        tone="card"
        className={cn(
          "flex flex-col gap-5 p-5 sm:p-6 transition-all duration-300",
          !isActive && "opacity-75 grayscale-[0.3]",
          isPending && "pointer-events-none opacity-50"
        )}
      >
        {/* Card header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-headline-sm font-bold text-on-surface">
                {program.name}
              </h2>
              <Pill tone={isActive ? "mastered" : "neutral"} size="sm">
                {isActive ? "Active" : "Paused"}
              </Pill>
            </div>
            <div className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
              <Layers className="size-3.5 shrink-0" />
              <span>Deck: {program.deck_name}</span>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            {isPending ? (
              <Loader2 className="size-4 animate-spin text-on-surface-variant" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex size-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Options for ${program.name}`}
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={handleToggle}>
                    {isActive ? "Pause" : "Resume"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Buckets */}
        <div className="space-y-2">
          {program.buckets.map((bucket) => (
            <BucketRow key={bucket.name} bucket={bucket} isActive={isActive} />
          ))}
        </div>

        {/* Upcoming sessions or empty state */}
        {program.sessions.length > 0 ? (
          <div className="space-y-2 pt-1">
            <p className="text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
              Upcoming Sessions
            </p>
            <div className="flex flex-wrap gap-2">
              {program.sessions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-on-surface"
                >
                  <Calendar className="size-3.5 text-primary shrink-0" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-label-md font-semibold">{s.date}</span>
                    <span className="text-label-sm text-on-surface-variant">
                      ({s.cards} cards)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-body-sm italic text-on-surface-variant">
              {isActive ? "No cards are scheduled yet" : "This program is paused"}
            </p>
            <p className="mt-0.5 text-label-sm text-on-surface-variant/70">
              {isActive
                ? "New review sessions will appear when a bucket becomes due"
                : "Resume to restart scheduling"}
            </p>
            {!isActive && (
              <Button
                onClick={handleToggle}
                size="sm"
                className="mt-3 gap-1.5"
              >
                <Play className="size-3.5 fill-current" />
                Resume now
              </Button>
            )}
          </div>
        )}
      </Surface>

      <DeleteProgramDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        program={{ id: program.id, name: program.name }}
      />
    </>
  )
}
