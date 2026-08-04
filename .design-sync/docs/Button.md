---
category: Primitives
---

Button — the single action primitive. shadcn wrapper over `@base-ui/react/button`, styled with `buttonVariants` (class-variance-authority).

`variant` × `size` are the only appearance knobs; never restyle a button with ad-hoc background classes.

| variant | Use for |
|---|---|
| `default` | The primary action on a surface (solid `bg-primary`). One per view. |
| `secondary` | The paired non-primary action (solid `bg-secondary`). Also the "Review" / "Refresh" deck CTA. |
| `outline` | Neutral action that still needs a container. |
| `ghost` | Low-emphasis actions — "Edit", "Back", overflow-menu rows, icon buttons. Per DESIGN.md this is the default for tertiary actions. |
| `destructive` | Delete/remove. Tinted (`bg-destructive/10`), not solid — deliberate. |
| `link` | Inline text action. |

Sizes: `xs` `sm` `default` (h-8) `lg`, plus square `icon-xs` `icon-sm` `icon` `icon-lg` for icon-only buttons (always pass `aria-label` with those).

Icons are lucide-react elements passed as children; the variant CSS sizes any `svg` child automatically (`size-4`, `size-3.5` at `sm`).

`buttonVariants({ variant, size, className })` is exported separately — use it to give a `next/link` anchor button styling instead of nesting a button inside a link (that is how `DeckCard` renders its "Study now" CTA).
