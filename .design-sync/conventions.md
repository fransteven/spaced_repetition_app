# NeuroCards — how to build with this design system

NeuroCards is a spaced-repetition (FSRS 4.5) flashcard app. The design language is
**"The Cognitive Atelier"**: editorial whitespace, tonal layering instead of lines,
Inter, indigo primary, emerald tertiary for mastery. Full rules ship in
`guidelines/DESIGN.md` — read it before inventing a pattern.

## Setup: no provider, no wrapper

Components are self-contained. There is **no** ThemeProvider or context to wrap —
tokens are CSS custom properties on `:root` in the shipped stylesheet, so a
component renders correctly as soon as `styles.css` is loaded. Import from the
bundle global:

```jsx
const { Button, DeckCard, DashboardShell } = window.NeuroCards;
```

Two setup facts that do matter:

- **Dark mode** is class-based (`@custom-variant dark (&:is(.dark *))`). Put
  `class="dark"` on an ancestor (the app uses `<html>`) and every `dark:` utility
  plus every token flips. No prop, no provider.
- **Responsive breakpoints are load-bearing in the layout components.** `Sidebar`
  is `hidden lg:flex` and `MobileNav` is `lg:hidden`; below `lg` (1024px) the
  sidebar renders nothing. `DashboardShell` composes both and offsets content with
  `lg:ml-64 pt-24 pb-24` — build full pages with `DashboardShell`, not by
  hand-placing `TopNav` + `Sidebar`.

## Styling idiom: Tailwind v4 utilities, Material-You token names

There are **no CSS modules and no style props**. Every appearance decision is a
utility class, and colours come from the token families below (never raw hex,
never `blue-500`). Alpha tints (`bg-primary/10`, `border-outline-variant/15`) are
idiomatic and are what DESIGN.md's "Ghost Border" and tinted states are made of.

| Family | Names | Use for |
|---|---|---|
| Surfaces | `surface`, `surface-bright`, `surface-dim`, `surface-variant`, `surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest` | Tonal layering. Page = `surface`, section = `surface-container-low`, card = `surface-container-lowest`. |
| On-surface | `on-surface`, `on-surface-variant`, `on-background`, `inverse-surface`, `inverse-on-surface` | Text. Body copy `text-on-surface`; metadata `text-on-surface-variant`. Never `#000`. |
| Primary | `primary`, `on-primary`, `primary-container`, `on-primary-container`, `primary-fixed`, `primary-fixed-dim` | Brand + primary actions. |
| Secondary | `secondary`, `on-secondary`, `secondary-container`, `on-secondary-container` | Paired non-primary actions; the "learning" state dot. |
| Tertiary | `tertiary`, `on-tertiary`, `tertiary-container`, `on-tertiary-container` | Success / mastery only — the 2px mastery thread is `bg-tertiary`. |
| Error | `error`, `on-error`, `error-container`, `on-error-container`, plus shadcn `destructive` | Due counts, delete actions. |
| Outline | `outline`, `outline-variant` | Only as low-opacity ghost borders (`border-outline-variant/10`). |
| shadcn aliases | `background`, `foreground`, `card`, `popover`, `muted`, `muted-foreground`, `accent`, `border`, `input`, `ring` | What the primitives themselves use; fine to reuse. |

Radius: `rounded-sm|md|lg|xl|2xl|3xl|4xl` all derive from `--radius: 0.5rem`.
Cards are `rounded-xl`, controls `rounded-lg`. Type: Inter via `--font-inter`;
scale with `text-xs … text-7xl` and `font-medium|semibold|bold|black`.

Three DESIGN.md rules that are easy to violate: **no 1px solid dividers** for
sectioning (shift the background instead), **no pure-black shadows** — use the
ambient `shadow-[0px_12px_32px_rgba(25,28,29,0.04)]`, and **nav bars get
`backdrop-blur-[12px]`** over a translucent background.

## Where the truth lives

- `_ds/<folder>/styles.css` and its `@import` closure (`fonts/fonts.css`,
  `_ds_bundle.css`) — every token value and every compiled utility. If a class
  isn't in there, it does nothing; the stylesheet is the vocabulary.
- `guidelines/DESIGN.md` — the design language, verbatim from the repo.
- `components/<group>/<Name>/<Name>.prompt.md` + `.d.ts` — per-component API and
  usage. Compound components (`Dialog`, `Select`) document their parts there.

## One idiomatic build

```jsx
const { DashboardShell, DashboardDeckCard, Button } = window.NeuroCards;
const { FlaskConical } = lucide; // icons are lucide-react components

<DashboardShell>
  <header className="mb-10">
    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
      Tuesday, 25 July
    </p>
    <h1 className="text-4xl font-black tracking-tight text-on-surface">Good evening, Alex.</h1>
    <p className="mt-2 text-sm text-on-surface-variant">51 cards are due across 3 decks.</p>
  </header>

  <section className="rounded-xl bg-surface-container-low p-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        Continue studying
      </h2>
      <Button variant="ghost">View all decks</Button>
    </div>
    <DashboardDeckCard
      deckId="deck-organic-chem"
      icon={FlaskConical}
      title="Organic Chemistry"
      category="Science · 128 cards"
      mastery={48}
      due={17}
      iconBg="bg-primary/10"
      iconColor="text-primary"
    />
  </section>
</DashboardShell>
```

Note the split: **library components carry their own look** (never restyle a
`Button` with background classes — use `variant`/`size`), while your own layout
glue is plain utilities from the families above.
