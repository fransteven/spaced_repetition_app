"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { unwrapError } from "@/lib/api-envelope"
import { toast } from "sonner"

interface DeleteProgramDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  program: {
    id: string
    name: string
  }
}

export function DeleteProgramDialog({
  open,
  onOpenChange,
  program,
}: DeleteProgramDialogProps): React.JSX.Element {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/reminders/${program.id}`, { method: "DELETE" })
      const json: unknown = await response.json()

      if (!response.ok) {
        const errorMsg = unwrapError(json, "Unable to delete reminder program")
        setSubmitError(errorMsg)
        toast.error(errorMsg)
        setIsDeleting(false)
        return
      }

      toast.success("Reminder program deleted")
      onOpenChange(false)
      router.refresh()
    } catch {
      setSubmitError("Failed to delete reminder program. Please try again.")
      toast.error("Failed to delete reminder program")
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Delete reminder program</DialogTitle>
          <DialogDescription>
            This will permanently delete the reminder schedule for <strong>{program.name}</strong>.
            You will no longer receive daily review digests for this program. This action cannot be
            undone.
          </DialogDescription>

          {submitError && (
            <p className="mb-4 text-body-sm text-error">{submitError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <DialogClose className="px-4 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:text-on-surface">
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting…" : "Delete program"}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
