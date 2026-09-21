"use client"

import React from "react"
import Link from "next/link"
import { Bell, Plus } from "lucide-react"
import { EmptyState } from "@/components/primitives/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"

interface EmptyStateCardProps {
  hasDecks: boolean
  onNewProgram: () => void
}

export function EmptyStateCard({
  hasDecks,
  onNewProgram,
}: EmptyStateCardProps): React.JSX.Element {
  return (
    <EmptyState
      icon={<Bell className="size-9 text-primary" />}
      title="No reminder programs"
      body={
        hasDecks
          ? "Connect a deck to start scheduling automated reviews. NeuroCards groups cards into FSRS memory stability buckets and delivers a daily morning digest."
          : "Create a deck first, then connect it to an automated review schedule and daily morning digest."
      }
      action={
        hasDecks ? (
          <Button onClick={onNewProgram} size="lg">
            <Plus className="size-4" />
            New program
          </Button>
        ) : (
          <Link href="/decks" className={buttonVariants({ size: "lg" })}>
            <Plus className="size-4" />
            Create a deck
          </Link>
        )
      }
    />
  )
}
