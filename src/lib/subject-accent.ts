/**
 * Deterministic per-subject accent.
 *
 * The `decks` table has no colour column, and adding one would need a
 * migration. Hashing the normalised subject into a fixed token palette gives a
 * stable accent — the same subject renders identically in the deck list, the
 * detail header and the filter chips — with no schema change.
 */
export interface SubjectAccent {
  /** Tonal pill background + text pair. */
  pill: string
  /** Solid token for dots and threads. */
  dot: string
}

const PALETTE: SubjectAccent[] = [
  { pill: "bg-primary/10 text-primary", dot: "bg-primary" },
  { pill: "bg-tertiary/10 text-tertiary", dot: "bg-tertiary" },
  { pill: "bg-secondary/10 text-secondary", dot: "bg-secondary" },
  { pill: "bg-surface-tint/10 text-surface-tint", dot: "bg-surface-tint" },
  { pill: "bg-error/10 text-error", dot: "bg-error" },
  { pill: "bg-outline/15 text-on-surface-variant", dot: "bg-outline" },
]

export function subjectAccent(subject: string): SubjectAccent {
  const key = subject.trim().toLowerCase()
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

export function formatSubject(subject: string): string {
  const trimmed = subject.trim()
  if (!trimmed) return "Custom"
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}
