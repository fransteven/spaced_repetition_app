"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { GraduationCap, Send, Loader2, X } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useVisualViewport } from "@/hooks/use-visual-viewport"
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
  examToken: string
}

// Tallest the answer box grows before it scrolls (about six lines).
const INPUT_MAX_HEIGHT_PX = 160

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
  const lastAttemptRef = useRef<ExamMessage[]>([])
  const examTokenRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // On phones the sheet is pinned to the visible area so the keyboard never covers the answer box.
  const viewport = useVisualViewport(open)
  const viewportVars: CSSProperties & Record<`--${string}`, string> = viewport
    ? { "--exam-vv-height": `${viewport.height}px`, "--exam-vv-top": `${viewport.offsetTop}px` }
    : {}

  const requestTurn = async (nextMessages: ExamMessage[]) => {
    lastAttemptRef.current = nextMessages
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/study/exam", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ card_id: cardId, messages: nextMessages, exam_token: examTokenRef.current ?? undefined }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json?.error?.message ?? "Failed to reach the examiner")
        return
      }

      const result = json.data as ExamTurnResponse
      examTokenRef.current = result.examToken
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
      examTokenRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Keep the latest message in view, also when the keyboard opens and the sheet shrinks.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading, viewport?.height])

  // Grow the answer box with its text so the user always sees what they are sending.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT_PX)}px`
  }, [input, open])

  const handleSend = () => {
    const answer = input.trim()
    if (!answer || loading || done) return
    setInput("")
    void requestTurn([...messages, { role: "user", content: answer }])
  }

  const handleRetry = () => {
    void requestTurn(lastAttemptRef.current)
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
        <DialogPopup
          style={viewportVars}
          className={cn(
            "flex flex-col overflow-hidden transition-[opacity,scale]",
            // Phone: full-width sheet that fills exactly the visible area (above the keyboard).
            "inset-x-0 left-0 top-[var(--exam-vv-top,0px)] h-[var(--exam-vv-height,100dvh)] w-full translate-x-0 translate-y-0 rounded-none",
            "px-4 pt-[max(1rem,env(safe-area-inset-top))]",
            viewport?.keyboardOpen ? "pb-2" : "pb-[max(1rem,env(safe-area-inset-bottom))]",
            // Tablet and up: centred modal.
            "sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85dvh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6",
          )}
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
            <DialogTitle className="mb-0 flex-1">Quiz me</DialogTitle>
            <DialogClose
              render={<Button variant="ghost" size="icon-lg" aria-label="Close quiz" className="-mr-2" />}
            >
              <X className="size-5" />
            </DialogClose>
          </div>
          <DialogDescription className={cn("mb-2 sm:mb-4", viewport?.keyboardOpen && "sr-only")}>
            An AI tutor will pick a skill and quiz you on this card. Its verdict sets the rating.
          </DialogDescription>

          <div
            ref={scrollRef}
            className="flex-1 min-h-0 sm:min-h-[240px] overflow-y-auto overscroll-contain flex flex-col gap-3 py-2 pr-1"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
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
            <div className="flex shrink-0 items-center justify-between gap-3 bg-error-container px-3 py-2 rounded-lg mb-2">
              <p className="text-sm text-on-error-container">{error}</p>
              <Button
                onClick={handleRetry}
                disabled={loading}
                size="sm"
                variant="secondary"
                className="shrink-0"
              >
                Retry
              </Button>
            </div>
          )}

          {done && verdict ? (
            <div className="flex shrink-0 flex-col gap-3 pt-2">
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
                Continue
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 items-end gap-2 pt-2">
              <textarea
                ref={inputRef}
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
                rows={1}
                enterKeyHint="send"
                aria-label="Your answer"
                // 16px on phones: iOS zooms the page when a smaller input gets focus.
                className="min-h-11 flex-1 resize-none overflow-y-auto rounded-lg bg-surface-container-low px-3 py-2.5 text-body-lg text-on-surface outline-none focus:bg-primary-fixed/10 disabled:opacity-50 sm:text-body-md"
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                size="icon"
                className="size-11 shrink-0"
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
