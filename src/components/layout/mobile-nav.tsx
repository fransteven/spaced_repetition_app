"use client"

import Link from "next/link"

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t border-outline-variant/10 flex justify-around items-center px-4 py-3 z-50">
      <Link href="/" className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-2xl">dashboard</span>
        <span className="text-[10px] font-medium">Dashboard</span>
      </Link>
      
      <Link href="/decks" className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-2xl">style</span>
        <span className="text-[10px] font-bold">Decks</span>
      </Link>
      
      <div className="relative -top-6">
        <button className="w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:opacity-90">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>

      <Link href="/reminders" className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-2xl">notifications_active</span>
        <span className="text-[10px] font-medium">Reminders</span>
      </Link>

      <Link href="/analytics" className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-2xl">leaderboard</span>
        <span className="text-[10px] font-medium">Stats</span>
      </Link>
    </nav>
  )
}
