"use client"

import { useEffect, useRef, useState } from "react"
import { GraduationCap, Send, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { FsrsRating } from "@/lib/fsrs/types"

interface ExamMessage {
  role:    "user" | "assistant"
  content: string
}

interface ExamVerdict {
  rating:    FsrsRating
  feedback:  string
  skillUsed: string
}

interface ExamTurnResponse {
  message: string
  done:    boolean
  verdict: ExamVerdict | null
}

const VERDICT_STYLE: Record<FsrsRating, { label: string; className: string }> = {
  again: { label: "Again", className: "bg-error text-on-error" },
  hard:  { label: "Hard",  className: "bg-secondary text-on-secondary" },
  good:  { label: "Good",  className: "bg-primary text-on-primary" },
  easy:  { label: "Easy",  className: "bg-tertiary text-on-tertiary" },
}

interface Props {
  open:         boolean
  onOpenChange: (open: boolean) => void
  cardId:       string
  onVerdict:    (rating: FsrsRating) => void
}

export function ExamDialog({ open, onOpenChange, cardId, onVerdict }: Props) {
  const [messages, setMessages] = useState<ExamMessage[]>([])
  const [input,    setInput]    = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [verdict,  setVerdict]  = useState<ExamVerdict | null>(null)
  const [done,     setDone]     = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  const requestTurn = async (nextMessages: ExamMessage[]) => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/study/exam", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ card_id: cardId, messages: nextMessages }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json?.error?.message ?? "Failed to reach the examiner")
        return
      }

      const result = json.data as ExamTurnResponse
      setMessages([...nextMessages, { role: "assistant", content: result.message }])
      if (result.done && result.verdict) {
        setDone(true)
        setVerdict(result.verdict)
      }
    } catch (err) {
      console.error('[ExamDialog turn]', err)
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true
      void requestTurn([])
    }
    if (!open) {
      startedRef.current = false
      setMessages([])
      setInput("")
      setError(null)
      setVerdict(null)
      setDone(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  const handleSend = () => {
    const answer = input.trim()
    if (!answer || loading || done) return
    setInput("")
    void requestTurn([...messages, { role: "user", content: answer }])
  }

  const handleContinue = () => {
    if (!verdict) return
    onVerdict(verdict.rating)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="sm:max-w-lg flex flex-col max-h-[85vh]">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-primary" />
            <DialogTitle className="mb-0">Examíname</DialogTitle>
          </div>
          <DialogDescription>
            An AI tutor will pick a skill and quiz you on this card. Its verdict sets the rating.
          </DialogDescription>

          <div
            ref={scrollRef}
            className="flex-1 min-h-[240px] overflow-y-auto flex flex-col gap-3 py-2 pr-1"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "self-end bg-primary text-on-primary"
                    : "self-start bg-surface-container-low text-on-surface"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="self-start flex items-center gap-2 text-on-surface-variant text-sm px-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking…
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg mb-2">{error}</p>
          )}

          {done && verdict ? (
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${VERDICT_STYLE[verdict.rating].className}`}
                >
                  {VERDICT_STYLE[verdict.rating].label}
                </span>
                <span className="text-xs text-on-surface-variant">via {verdict.skillUsed}</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">{verdict.feedback}</p>
              <Button onClick={handleContinue} className="w-full">
                Continuar
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={loading}
                placeholder="Type your answer…"
                rows={2}
                className="flex-1 resize-none rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none focus:bg-primary-fixed/10 disabled:opacity-50"
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                size="icon"
                aria-label="Send answer"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
