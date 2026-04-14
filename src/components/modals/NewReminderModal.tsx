"use client"

import { useState } from "react"

interface Props {
  onClose: () => void
}

const BUCKETS = [
  { dot: "bg-error", name: "New / Struggling", cards: "142 cards", interval: "Every 4 hours" },
  { dot: "bg-secondary", name: "Acquiring", cards: "89 cards", interval: "Every 2 days" },
  { dot: "bg-tertiary", name: "Mastered", cards: "215 cards", interval: "Every 14 days" },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-tertiary" : "bg-surface-container-highest"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

export default function NewReminderModal({ onClose }: Props) {
  const [gcal, setGcal] = useState(true)
  const [gmail, setGmail] = useState(true)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest w-full max-w-[680px] rounded-xl shadow-2xl overflow-hidden border border-outline-variant/20">
        {/* Header */}
        <div className="px-10 py-8">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">
              New Reminder Program
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
          </div>
          <p className="text-on-surface-variant text-sm">
            Configure your bespoke learning schedule.
          </p>
        </div>

        {/* Content */}
        <div className="px-10 pb-10 space-y-8">
          {/* Name + Deck */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Program name
              </label>
              <input
                type="text"
                placeholder="e.g. Morning Phrasal Drills"
                className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg px-4 py-3 text-sm transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Select deck
              </label>
              <div className="relative">
                <select className="w-full appearance-none bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg px-4 py-3 text-sm pr-10 cursor-pointer outline-none">
                  <option>Phrasal Verbs</option>
                  <option>Common Idioms</option>
                  <option>Professional Jargon</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-primary-container/10 border-l-4 border-primary p-5 rounded-r-lg flex gap-4">
            <span className="material-symbols-outlined text-primary shrink-0">info</span>
            <p className="text-sm leading-relaxed text-on-primary-fixed-variant">
              Cards will be automatically grouped into 3 buckets based on memory strength and
              scheduled accordingly.
            </p>
          </div>

          {/* Bucket preview */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Memory Bucket Preview
            </h3>
            <div className="bg-surface-container-low rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 px-6 py-3 border-b border-outline-variant/10 bg-surface-container-high/50">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                  Bucket Name
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase text-center">
                  Card Count
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase text-right">
                  Interval
                </span>
              </div>
              {BUCKETS.map((b, i) => (
                <div
                  key={b.name}
                  className={`grid grid-cols-3 px-6 py-4 items-center ${
                    i > 0 ? "border-t border-outline-variant/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${b.dot}`} />
                    <span className="text-sm font-medium">{b.name}</span>
                  </div>
                  <span className="text-sm text-center font-semibold">{b.cards}</span>
                  <span className="text-sm text-right text-on-surface-variant">{b.interval}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-8 pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Connect Google Calendar</p>
                <p className="text-xs text-on-surface-variant">Block study slots automatically</p>
              </div>
              <Toggle checked={gcal} onChange={() => setGcal((v) => !v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Send Gmail reminders</p>
                <p className="text-xs text-on-surface-variant">Get notified for daily sessions</p>
              </div>
              <Toggle checked={gmail} onChange={() => setGmail((v) => !v)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low px-10 py-6 flex justify-end items-center gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
          <button className="bg-primary-container px-8 py-2.5 rounded-lg text-on-primary text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all">
            Create Program
          </button>
        </div>
      </div>
    </div>
  )
}
