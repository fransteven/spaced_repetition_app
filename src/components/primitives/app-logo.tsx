import Image from "next/image"
import Link from "next/link"
import type { JSX } from "react"

import { cn } from "@/lib/utils"

interface AppLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
  href?: string
}

const SIZE_MAP = {
  sm: { image: "size-7", text: "text-base font-bold" },
  md: { image: "size-9", text: "text-lg font-black" },
  lg: { image: "size-12", text: "text-xl font-extrabold" },
} satisfies Record<NonNullable<AppLogoProps["size"]>, { image: string; text: string }>

export function AppLogo({
  size = "md",
  showText = true,
  className,
  href,
}: AppLogoProps): JSX.Element {
  const content = (
    <span className={cn("flex items-center gap-2.5 select-none", className)}>
      <span
        className={cn(
          "relative block shrink-0 overflow-hidden rounded-lg shadow-sm",
          SIZE_MAP[size].image,
        )}
      >
        <Image
          src="/logo.png"
          alt="NeuroCards Logo"
          fill
          sizes={size === "lg" ? "48px" : size === "md" ? "36px" : "28px"}
          className="object-cover"
          priority
        />
      </span>
      {showText ? (
        <span className={cn("tracking-tight text-on-surface", SIZE_MAP[size].text)}>
          NeuroCards
        </span>
      ) : null}
    </span>
  )

  return href ? (
    <Link href={href} className="inline-flex items-center transition-opacity hover:opacity-95">
      {content}
    </Link>
  ) : (
    content
  )
}
