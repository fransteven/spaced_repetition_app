"use client"

import { useTransition } from "react"
import { Mail, Loader2 } from "lucide-react"
import { sendDigestNowAction } from "@/app/actions/reminder-actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function SendDigestButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await sendDigestNowAction()
        if (result.success) {
          toast.success("Digest queued — check your inbox in a moment.")
        } else {
          toast.error(result.error ?? "Could not queue the digest.")
        }
      } catch {
        toast.error("Failed to send digest. Please check SMTP settings.")
      }
    })
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleClick}
      disabled={isPending}
      className="gap-2"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Mail className="size-4" />
      )}
      {isPending ? "Sending…" : "Send now"}
    </Button>
  )
}
