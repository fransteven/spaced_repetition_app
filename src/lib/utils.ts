import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The type scale from globals.css (text-body-sm, text-label-md, …). Without it tailwind-merge reads
// `text-label-sm` as a colour and drops the real colour class next to it (e.g. text-primary-foreground).
const TYPE_SCALE = ["display", "headline", "body", "label", "metric"].flatMap((role) =>
  ["lg", "md", "sm"].map((size) => `${role}-${size}`)
)

const twMerge = extendTailwindMerge({ extend: { theme: { text: TYPE_SCALE } } })

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount)
}
