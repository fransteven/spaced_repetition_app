"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Layers, Play, type LucideIcon } from "lucide-react"

import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { SearchField } from "@/components/primitives/search-field"
import { PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/nav-config"
import { formatSubject } from "@/lib/subject-accent"
import { useListSearch, normalizeSearchText } from "@/hooks/use-list-search"
import { cn } from "@/lib/utils"

export interface PaletteDeck {
  id: string
  name: string
  subject: string
  description: string | null
}

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  decks: PaletteDeck[]
}

interface PaletteAction {
  id: string
  group: "decks" | "study" | "nav"
  label: string
  sublabel: string | null
  icon: LucideIcon
  onSelect: () => void
}

interface PaletteGroupProps {
  title: string
  actions: PaletteAction[]
  activeIndex: number
  startIndex: number
  onHover: (index: number) => void
  registerRef: (id: string, el: HTMLDivElement | null) => void
}

function PaletteGroup({
  title,
  actions,
  activeIndex,
  startIndex,
  onHover,
  registerRef,
}: PaletteGroupProps) {
  if (actions.length === 0) return null

  return (
    <div>
      <div className="px-3 py-1 text-label-sm uppercase text-on-surface-variant">
        {title}
      </div>
      <div className="mt-1 space-y-0.5">
        {actions.map((action, i) => {
          const itemIndex = startIndex + i
          const isSelected = itemIndex === activeIndex
          return (
            <div
              key={action.id}
              ref={(el) => registerRef(action.id, el)}
              role="option"
              aria-selected={isSelected}
              onClick={action.onSelect}
              onMouseEnter={() => onHover(itemIndex)}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5 text-body-sm cursor-pointer transition-colors",
                isSelected
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-on-surface hover:bg-surface-container-low"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <action.icon
                  className={cn(
                    "size-4 shrink-0",
                    isSelected ? "text-primary" : "text-outline"
                  )}
                />
                <span className="truncate">{action.label}</span>
              </div>
              {action.sublabel && (
                <span
                  className={cn(
                    "text-label-sm px-2 py-0.5 rounded-full shrink-0 ml-2",
                    isSelected
                      ? "bg-primary/20 text-primary"
                      : "bg-surface-container text-on-surface-variant"
                  )}
                >
                  {action.sublabel}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CommandPalette({
  open,
  onOpenChange,
  decks,
}: CommandPaletteProps): React.JSX.Element {
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const getDeckHaystack = useCallback(
    (deck: PaletteDeck): Array<string | null | undefined> => [
      deck.name,
      deck.subject,
      deck.description,
    ],
    []
  )

  const {
    query,
    setQuery,
    results: filteredDecks,
  } = useListSearch(decks, getDeckHaystack)

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setQuery("")
        setActiveIndex(0)
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange, setQuery]
  )

  const closePalette = useCallback(() => {
    setQuery("")
    setActiveIndex(0)
    onOpenChange(false)
  }, [onOpenChange, setQuery])

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      setQuery(nextQuery)
      setActiveIndex(0)
    },
    [setQuery]
  )

  const navItems = useMemo(() => [...PRIMARY_NAV, ...SECONDARY_NAV], [])

  const filteredNav = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return navItems
    const tokens = normalizeSearchText(trimmed).split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return navItems
    return navItems.filter((item) => {
      const norm = normalizeSearchText(item.label)
      return tokens.every((token) => norm.includes(token))
    })
  }, [navItems, query])

  const deckActions = useMemo((): PaletteAction[] => {
    return filteredDecks.map((deck) => ({
      id: `deck-${deck.id}`,
      group: "decks",
      label: deck.name,
      sublabel: formatSubject(deck.subject),
      icon: Layers,
      onSelect: () => {
        closePalette()
        router.push(`/decks/${deck.id}`)
      },
    }))
  }, [closePalette, filteredDecks, router])

  const studyActions = useMemo((): PaletteAction[] => {
    return filteredDecks.map((deck) => ({
      id: `study-${deck.id}`,
      group: "study",
      label: `Study ${deck.name}`,
      sublabel: formatSubject(deck.subject),
      icon: Play,
      onSelect: () => {
        closePalette()
        router.push(`/study/${deck.id}`)
      },
    }))
  }, [closePalette, filteredDecks, router])

  const navActions = useMemo((): PaletteAction[] => {
    return filteredNav.map((item) => ({
      id: `nav-${item.href}`,
      group: "nav",
      label: item.label,
      sublabel: null,
      icon: item.icon,
      onSelect: () => {
        closePalette()
        router.push(item.href)
      },
    }))
  }, [closePalette, filteredNav, router])

  const flattenedActions = useMemo((): PaletteAction[] => {
    return [...deckActions, ...studyActions, ...navActions]
  }, [deckActions, studyActions, navActions])

  // Scroll active item into view
  useEffect(() => {
    const activeItem = flattenedActions[activeIndex]
    if (activeItem) {
      const el = itemRefs.current.get(activeItem.id)
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex, flattenedActions])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (flattenedActions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % flattenedActions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + flattenedActions.length) % flattenedActions.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const current = flattenedActions[activeIndex]
      if (current) {
        current.onSelect()
      }
    }
  }

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el)
    else itemRefs.current.delete(id)
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="p-0 sm:max-w-xl max-h-[85vh] flex flex-col overflow-hidden bg-surface-container-lowest">
          <DialogTitle className="sr-only">Quick search</DialogTitle>
          <DialogDescription className="sr-only">
            Search decks, study sessions, and navigation
          </DialogDescription>

          <div className="p-3 bg-surface-container-low/50">
            <SearchField
              value={query}
              onChange={handleQueryChange}
              placeholder="Search decks, study, or navigate… (⌘K)"
              autoFocus
              onKeyDown={handleKeyDown}
            />
          </div>

          <div
            role="listbox"
            className="max-h-96 overflow-y-auto p-2 space-y-4"
          >
            {flattenedActions.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <p className="text-body-md text-on-surface">
                  No results match “{query.trim()}”
                </p>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Try searching for a different deck, subject, or page.
                </p>
              </div>
            ) : (
              <>
                <PaletteGroup
                  title="Decks"
                  actions={deckActions}
                  activeIndex={activeIndex}
                  startIndex={0}
                  onHover={setActiveIndex}
                  registerRef={registerRef}
                />
                <PaletteGroup
                  title="Study"
                  actions={studyActions}
                  activeIndex={activeIndex}
                  startIndex={deckActions.length}
                  onHover={setActiveIndex}
                  registerRef={registerRef}
                />
                <PaletteGroup
                  title="Go to"
                  actions={navActions}
                  activeIndex={activeIndex}
                  startIndex={deckActions.length + studyActions.length}
                  onHover={setActiveIndex}
                  registerRef={registerRef}
                />
              </>
            )}
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
