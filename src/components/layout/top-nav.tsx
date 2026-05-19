"use client"

import Link from "next/link"

export function TopNav() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-[12px] flex justify-between items-center px-8 py-4 shadow-sm border-b border-outline-variant/10">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-bold text-primary tracking-tight">
          NeuroCards
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Search..."
            className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 text-sm"
          />
        </div>
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/20">
          <span className="hidden sm:inline-block text-sm font-medium text-on-surface">
            Alex Rivera
          </span>
          <div className="w-10 h-10 rounded-full bg-surface-container-high ring-2 ring-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-on-surface-variant select-none">AR</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
