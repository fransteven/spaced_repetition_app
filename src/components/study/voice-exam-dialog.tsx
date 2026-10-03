"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBackdrop, DialogDescription, DialogPopup, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import type { FsrsRating } from "@/lib/fsrs/types"
import { unwrapError } from "@/lib/api-envelope"
import { useSlowStart, VOICE_STARTING_HINT } from "@/hooks/use-slow-start"

const StartSchema = z.object({
  attempt_id: z.string().uuid(),
  ticket: z.string(),
  ws_url: z.string(),
})

const ResultSchema = z.object({
  attempt_id: z.string().uuid(),
  status: z.string(),
  transcript: z.string().nullable(),
  rating: z.enum(["again", "hard", "good", "easy"]).nullable(),
  feedback: z.string().nullable(),
  skill_used: z.string().nullable(),
  scheduled_days: z.number().nullable(),
  due_date: z.string().nullable(),
})

const EventSchema = z.object({
  type: z.string(),
  attempt_id: z.string().optional(),
  text: z.string().optional(),
  message: z.string().optional(),
  data: ResultSchema.optional(),
})

type VoiceResult = z.infer<typeof ResultSchema>
type Phase = "idle" | "connecting" | "listening" | "grading" | "result" | "error"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardId: string
  onReviewed: (rating: FsrsRating) => void
}

export function VoiceExamDialog({ open, onOpenChange, cardId, onReviewed }: Props): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("idle")
  const startingService = useSlowStart(phase === "connecting")
  const [error, setError] = useState<string | null>(null)
  const [studentTranscript, setStudentTranscript] = useState("")
  const [tutorTranscript, setTutorTranscript] = useState("")
  const [result, setResult] = useState<VoiceResult | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const captureRef = useRef<AudioContext | null>(null)
  const playbackRef = useRef<AudioContext | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const sourcesRef = useRef<AudioBufferSourceNode[]>([])
  const nextAudioAtRef = useRef(0)
  const attemptRef = useRef<string | null>(null)
  const completedRef = useRef(false)
  const reviewedRef = useRef(false)
  const phaseRef = useRef<Phase>("idle")

  const changePhase = (next: Phase): void => {
    phaseRef.current = next
    setPhase(next)
  }

  const stopMicrophone = (): void => {
    workletRef.current?.disconnect()
    workletRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (captureRef.current) void captureRef.current.close()
    captureRef.current = null
  }

  const stopPlayback = (): void => {
    for (const source of sourcesRef.current) {
      try { source.stop() } catch { /* source already ended */ }
    }
    sourcesRef.current = []
    nextAudioAtRef.current = 0
  }

  const releaseAudio = (): void => {
    stopMicrophone()
    stopPlayback()
    if (playbackRef.current) void playbackRef.current.close()
    playbackRef.current = null
  }

  const playAudio = (pcm: ArrayBuffer): void => {
    const context = playbackRef.current
    if (!context || pcm.byteLength % 2 !== 0) return
    const samples = new Int16Array(pcm)
    const buffer = context.createBuffer(1, samples.length, 24000)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    const startAt = Math.max(context.currentTime + 0.02, nextAudioAtRef.current)
    source.start(startAt)
    nextAudioAtRef.current = startAt + buffer.duration
    sourcesRef.current.push(source)
    source.onended = () => {
      sourcesRef.current = sourcesRef.current.filter((item) => item !== source)
    }
  }

  const recoverResult = async (attemptId: string): Promise<void> => {
    for (let retry = 0; retry < 45; retry++) {
      if (attemptRef.current !== attemptId) return
      try {
        const response = await fetch(`/api/study/voice-attempts/${attemptId}`)
        const envelope: unknown = await response.json()
        if (response.ok && typeof envelope === "object" && envelope !== null && "data" in envelope) {
          const parsed = ResultSchema.safeParse(envelope.data)
          if (parsed.success && (parsed.data.status === "graded" || parsed.data.status === "unassessable")) {
            setResult(parsed.data)
            changePhase("result")
            return
          }
        }
      } catch { /* retry a short server interruption */ }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    setError("The connection ended before the result could be recovered. Please try again.")
    changePhase("error")
  }

  const startCapture = async (stream: MediaStream): Promise<void> => {
    const context = captureRef.current
    const socket = socketRef.current
    if (!context || !socket) return
    await context.audioWorklet.addModule("/voice-capture-worklet.js")
    if (socketRef.current !== socket || !stream.active) return
    const source = context.createMediaStreamSource(stream)
    const worklet = new AudioWorkletNode(context, "voice-capture")
    const silent = context.createGain()
    silent.gain.value = 0
    source.connect(worklet).connect(silent).connect(context.destination)
    worklet.port.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data instanceof ArrayBuffer && socket.readyState === WebSocket.OPEN && socket.bufferedAmount < 256_000) {
        socket.send(event.data)
      }
    }
    workletRef.current = worklet
    await context.resume()
  }

  const start = async (): Promise<void> => {
    const previousSocket = socketRef.current
    socketRef.current = null
    previousSocket?.close()
    releaseAudio()
    if (attemptRef.current && !completedRef.current) {
      await fetch(`/api/study/voice-attempts/${attemptRef.current}`, { method: "DELETE" }).catch(() => undefined)
    }
    attemptRef.current = null
    changePhase("connecting")
    setError(null)
    setResult(null)
    setStudentTranscript("")
    setTutorTranscript("")
    completedRef.current = false
    reviewedRef.current = false
    try {
      const capture = new AudioContext()
      const playback = new AudioContext()
      captureRef.current = capture
      playbackRef.current = playback
      await playback.resume()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
      streamRef.current = stream

      const response = await fetch("/api/study/voice-attempts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId }),
      })
      const envelope: unknown = await response.json()
      if (!response.ok) throw new Error(unwrapError(envelope, "Could not start voice exam"))
      if (typeof envelope !== "object" || envelope === null || !("data" in envelope)) {
        throw new Error("Invalid voice exam response")
      }
      const started = StartSchema.parse(envelope.data)
      attemptRef.current = started.attempt_id
      const socket = new WebSocket(started.ws_url)
      socket.binaryType = "arraybuffer"
      socketRef.current = socket
      socket.onopen = () => socket.send(JSON.stringify({ type: "auth", ticket: started.ticket }))
      socket.onmessage = (event: MessageEvent<unknown>) => {
        if (socketRef.current !== socket) return
        if (event.data instanceof ArrayBuffer) {
          playAudio(event.data)
          return
        }
        if (typeof event.data !== "string") return
        let raw: unknown
        try { raw = JSON.parse(event.data) } catch { return }
        const parsed = EventSchema.safeParse(raw)
        if (!parsed.success) return
        const message = parsed.data
        if (message.type === "ready") {
          void startCapture(stream).then(() => changePhase("listening")).catch((cause: unknown) => {
            console.error("[VoiceExam capture]", cause)
            setError("Microphone setup failed")
            changePhase("error")
          })
        } else if (message.type === "user_transcript" && message.text) {
          setStudentTranscript((previous) => `${previous} ${message.text}`.trim())
        } else if (message.type === "tutor_transcript" && message.text) {
          setTutorTranscript((previous) => `${previous} ${message.text}`.trim())
        } else if (message.type === "interrupted") {
          stopPlayback()
        } else if (message.type === "result" && message.data) {
          completedRef.current = true
          setResult(message.data)
          changePhase("result")
        } else if (message.type === "unassessable") {
          setError(message.message ?? "No clear answer was detected")
          changePhase("error")
        } else if (message.type === "error") {
          setError(message.message ?? "Voice exam failed")
          changePhase("error")
        }
      }
      socket.onclose = () => {
        if (socketRef.current !== socket) return
        stopMicrophone()
        if (!completedRef.current && phaseRef.current === "grading" && attemptRef.current) {
          void recoverResult(attemptRef.current)
        } else if (!completedRef.current && phaseRef.current === "listening") {
          setError("Voice connection closed. Please try again.")
          changePhase("error")
        }
      }
      socket.onerror = () => {
        if (socketRef.current !== socket) return
        if (phaseRef.current !== "result") {
          setError("Voice connection failed. Please try again.")
          changePhase("error")
        }
      }
    } catch (cause) {
      console.error("[VoiceExam start]", cause)
      setError(cause instanceof Error ? cause.message : "Could not start voice exam")
      changePhase("error")
      releaseAudio()
    }
  }

  const finish = (): void => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    stopMicrophone()
    changePhase("grading")
    socket.send(JSON.stringify({ type: "finish" }))
  }

  const close = (): void => {
    if (phase === "grading") return
    const rating = result?.rating
    if (rating && !reviewedRef.current) {
      reviewedRef.current = true
      onReviewed(rating)
    }
    if (!completedRef.current && attemptRef.current) {
      void fetch(`/api/study/voice-attempts/${attemptRef.current}`, { method: "DELETE" })
    }
    socketRef.current?.close()
    socketRef.current = null
    releaseAudio()
    attemptRef.current = null
    changePhase("idle")
    onOpenChange(false)
  }

  useEffect(() => () => {
    socketRef.current?.close()
    workletRef.current?.disconnect()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    for (const source of sourcesRef.current) {
      try { source.stop() } catch { /* source already ended */ }
    }
    if (captureRef.current) void captureRef.current.close()
    if (playbackRef.current) void playbackRef.current.close()
  }, [])

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close() }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="flex max-h-[85vh] flex-col gap-4 sm:max-w-lg">
          <DialogTitle>Oral exam</DialogTitle>
          <DialogDescription>Answer this card aloud. Gemini will assess what you recalled and FSRS will set the next review.</DialogDescription>

          <div className="rounded-xl bg-surface-container-low p-4" aria-live="polite">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              {phase === "listening" ? <Mic className="size-4 text-primary" /> : <Volume2 className="size-4" />}
              {phase === "connecting" ? "Connecting…" : phase === "listening" ? "Listening" : phase === "grading" ? "Evaluating…" : phase === "result" ? "Result" : "Ready"}
            </div>
            {tutorTranscript && <p className="mb-3 text-sm text-on-surface">{tutorTranscript}</p>}
            {studentTranscript && <p className="text-sm text-on-surface-variant"><span className="font-medium">You:</span> {studentTranscript}</p>}
            {!tutorTranscript && !studentTranscript && <p className="text-sm text-on-surface-variant">{phase === "connecting" && startingService ? VOICE_STARTING_HINT : "Start when your microphone is ready."}</p>}
          </div>

          {error && <p className="rounded-lg bg-error-container p-3 text-sm text-on-error-container" role="alert">{error}</p>}
          {result && (
            <div className="rounded-xl bg-primary-fixed/20 p-4" aria-live="polite">
              <p className="font-semibold capitalize">{result.rating ?? "Not assessable"}</p>
              <p className="mt-1 text-sm">{result.feedback}</p>
              {result.transcript && <p className="mt-2 text-sm text-on-surface-variant">Your answer: {result.transcript}</p>}
              {result.rating && result.due_date && (
                <p className="mt-2 text-sm">Next review: {new Date(result.due_date).toLocaleString()} ({result.scheduled_days === 0 ? "later today" : `in ${result.scheduled_days} day${result.scheduled_days === 1 ? "" : "s"}`})</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {phase !== "grading" && <Button type="button" variant="secondary" onClick={close}>Close</Button>}
            {(phase === "idle" || phase === "error") && <Button type="button" onClick={() => void start()}><Mic className="size-4" /> Start speaking</Button>}
            {phase === "connecting" && <Button type="button" disabled><Loader2 className="size-4 animate-spin" /> Connecting</Button>}
            {phase === "listening" && <Button type="button" onClick={finish}><MicOff className="size-4" /> Finish answer</Button>}
            {phase === "grading" && <Button type="button" disabled><Loader2 className="size-4 animate-spin" /> Grading</Button>}
            {phase === "result" && <Button type="button" onClick={result?.rating ? close : () => void start()}>{result?.rating ? "Continue" : "Try another attempt"}</Button>}
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
