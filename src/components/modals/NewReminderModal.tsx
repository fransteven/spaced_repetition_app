"use client"

import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { CreateReminderProgramSchema } from "@/lib/validations"
import { Info, Sparkles } from "lucide-react"
import type { z } from "zod"
import type { DeckListPageItem } from "@/lib/services/deck-service"

import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pill } from "@/components/primitives/pill"
import { Surface } from "@/components/primitives/surface"
import { toast } from "sonner"
import { unwrapError } from "@/lib/api-envelope"

type FormValues = z.infer<typeof CreateReminderProgramSchema>

interface Props {
  decks: DeckListPageItem[]
  onClose: () => void
}

interface BucketPreview {
  name: string
  cards: number
  intervalDays: number
}

function readBucketPreview(payload: unknown): BucketPreview[] {
  if (typeof payload !== "object" || payload === null || !("data" in payload)) return []
  const data = payload.data
  if (!Array.isArray(data)) return []

  return data.filter((item): item is BucketPreview =>
    typeof item === "object" &&
    item !== null &&
    "name" in item &&
    typeof item.name === "string" &&
    "cards" in item &&
    typeof item.cards === "number" &&
    "intervalDays" in item &&
    typeof item.intervalDays === "number"
  )
}

const BUCKET_TONES: Record<string, "struggling" | "intermediate" | "mastered"> = {
  Struggling: "struggling",
  Intermediate: "intermediate",
  Mastered: "mastered",
}

export default function NewReminderModal({ decks, onClose }: Props) {
  const router = useRouter()
  const [preview, setPreview] = useState<BucketPreview[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateReminderProgramSchema),
    defaultValues: {
      name: "",
      deck_id: decks[0]?.id ?? "",
      enable_email: true,
    },
  })

  const deckId = useWatch({ control, name: "deck_id", defaultValue: decks[0]?.id ?? "" })

  useEffect(() => {
    if (!deckId) {
      setPreview([])
      return
    }

    let cancelled = false
    setPreviewLoading(true)

    fetch(`/api/reminders/preview?deckId=${encodeURIComponent(deckId)}`)
      .then(async (res) => {
        const json: unknown = await res.json()
        if (!cancelled) {
          setPreview(res.ok ? readBucketPreview(json) : [])
        }
      })
      .catch(() => {
        if (!cancelled) setPreview([])
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [deckId])

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json: unknown = await res.json()

      if (!res.ok) {
        const msg = unwrapError(json, "Failed to create program")
        setErrorMessage(msg)
        toast.error(msg)
        return
      }

      toast.success("Reminder program created!")
      router.refresh()
      onClose()
    } catch {
      setErrorMessage("Network error. Please try again.")
      toast.error("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="w-[calc(100%-2rem)] sm:w-full sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl">
          <header className="mb-6 space-y-1 text-left">
            <DialogTitle className="font-display text-display-sm text-on-surface">
              New Reminder Program
            </DialogTitle>
            <DialogDescription className="text-body-sm text-on-surface-variant mb-0">
              Configure automated review schedules delivered by email at 8:00 AM.
            </DialogDescription>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-left">
            {/* Name + Deck */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="program-name" className="text-label-md text-on-surface-variant">
                  Program name
                </Label>
                <Input
                  id="program-name"
                  type="text"
                  placeholder="e.g. Daily Biology Drills"
                  {...register("name")}
                  className="h-10 text-body-md"
                />
                {errors.name && (
                  <p className="text-label-sm text-error">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="select-deck" className="text-label-md text-on-surface-variant">
                  Select deck
                </Label>
                <Controller
                  name="deck_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="select-deck"
                        className="h-10 w-full text-body-md"
                        aria-invalid={Boolean(errors.deck_id)}
                      >
                        <SelectValue placeholder="Select a deck" />
                      </SelectTrigger>
                      <SelectContent>
                        {decks.map((deck) => (
                          <SelectItem key={deck.id} value={deck.id}>
                            {deck.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.deck_id && (
                  <p className="text-label-sm text-error">{errors.deck_id.message}</p>
                )}
              </div>
            </div>

            {/* Info hint */}
            <div className="flex gap-3 rounded-xl bg-primary/10 p-3.5 text-body-sm text-on-surface">
              <Info className="size-4 shrink-0 text-primary mt-0.5" />
              <p className="text-on-surface-variant">
                Cards will be automatically assigned to 3 stability buckets (Struggling, Intermediate, Mastered) and scheduled accordingly.
              </p>
            </div>

            {/* Bucket preview */}
            <div className="space-y-2">
              <span className="text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
                Memory Bucket Preview
              </span>
              <Surface tone="panel" className="space-y-1 overflow-hidden rounded-xl p-1">
                {previewLoading ? (
                  <div className="p-4 text-center text-body-sm text-on-surface-variant">
                    Calculating card buckets…
                  </div>
                ) : preview.length === 0 ? (
                  <div className="p-4 text-center text-body-sm text-on-surface-variant">
                    No cards in this deck yet.
                  </div>
                ) : (
                  preview.map((b) => {
                    const tone = BUCKET_TONES[b.name] ?? "intermediate"
                    return (
                      <div
                        key={b.name}
                        className="flex items-center justify-between rounded-lg bg-surface-container p-3 sm:px-4"
                      >
                        <div className="flex items-center gap-2.5">
                          <Pill tone={tone} size="sm">
                            {b.name}
                          </Pill>
                          <span className="text-body-sm font-semibold text-on-surface">
                            {b.cards} {b.cards === 1 ? "card" : "cards"}
                          </span>
                        </div>
                        <span className="text-label-sm text-on-surface-variant">
                          Every {b.intervalDays} {b.intervalDays === 1 ? "day" : "days"}
                        </span>
                      </div>
                    )
                  })
                )}
              </Surface>
            </div>

            {/* Email notification switch */}
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3.5">
              <div className="space-y-0.5">
                <Label htmlFor="email-digest" className="text-body-sm font-semibold text-on-surface cursor-pointer">
                  Email digest
                </Label>
                <p className="text-label-sm text-on-surface-variant">
                  Daily summary email at 8:00 AM when a bucket has cards due
                </p>
              </div>
              <Controller
                name="enable_email"
                control={control}
                render={({ field }) => (
                  <input
                    id="email-digest"
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    className="size-4 cursor-pointer rounded accent-primary"
                  />
                )}
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-lg bg-error-container p-3 text-on-error-container text-body-sm">
                {errorMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2"
              >
                <Sparkles className="size-4" />
                {submitting ? "Creating…" : "Create Program"}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
