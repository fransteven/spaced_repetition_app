# design-sync notes — NeuroCards

First sync: 2026-07-25. Project: `NeuroCards` (`07083f60-3a9b-41df-971e-2a8ae9139dcb`).
Shape: `package`. 20 components, all with authored previews graded good.

## This repo is an app, not a component library

There is no `dist/`, no Storybook, and no library build — so the standard converter
path does not apply. Three pieces of scaffolding make it work; all are committed
under `.design-sync/` and all are load-bearing:

- **`.design-sync/ds-entry.tsx`** is the bundle entry (passed via `--entry`). It
  re-exports exactly the DS surface: `src/components/ui/*` plus the presentational
  app components. Server-coupled components (`study-session`, `exam-dialog`,
  `CardEditor`, `CardList`, `reminders-content`, `skills-manager`, the deck
  dialogs) are deliberately excluded — they read the DB, server actions or
  `next-auth`. **To add a component: add its `export *` here AND an entry in
  `cfg.componentSrcMap` AND a `cfg.dtsPropsFor` body.**
- **`.design-sync/shims/`** replaces Next.js runtime modules, wired through
  `cfg.tsconfig` → `.design-sync/tsconfig.ds.json` `compilerOptions.paths`:
  `next/link` → `<a>`, `next/image` → `<img>`, `next/navigation` → stub router
  with `usePathname() === '/decks'` (chosen so nav components show a real active
  state in previews). `shims/process-global.ts` **must stay the first import in
  ds-entry.tsx** — bundled deps read bare `process.env.*` at module scope and the
  whole IIFE dies with "process is not defined" otherwise.
- **`.design-sync/build-css.mjs`** compiles `ds-tailwind.css` →
  `.design-sync/.cache/ds.css` (`cfg.cssEntry`) with the repo's own
  `@tailwindcss/postcss`. This is `cfg.buildCmd`; run it before the converter
  whenever component classes or the safelist change.

## Gotchas already paid for

- **Do not put a `"//"` comment key in `tsconfig.ds.json`.** The converter's
  tsconfig reader strips `//` comments before `JSON.parse`, which mangles such a
  key, silently drops the whole `paths` map, and esbuild then resolves the REAL
  `next/link` / `next/image` → 450 KB of Next internals in the bundle and a dead
  `window.NeuroCards`. Symptom: `[BUNDLE_EXPORT] 20/20 not a component`.
- **Props contracts are hand-written.** With no shipped `.d.ts` tree the extractor
  emits `[key: string]: unknown` for every component, so all 20 props bodies live
  in `cfg.dtsPropsFor`. They are the API contract the design agent codes against —
  **re-check them against source on every re-sync** (see Re-sync risks).
- **The stylesheet is the vocabulary.** Tailwind v4 only compiles classes it finds
  in scanned sources, but designs built in claude.ai/design are styled by our
  shipped CSS. `ds-tailwind.css` therefore carries an `@source inline(...)`
  safelist for the whole token palette (incl. `/NN` alpha steps and `hover:`/
  `dark:` variants) plus the common spacing/type/layout scale. CSS is ~900 KB
  because of it; that is intentional. Adding a token to `globals.css` means adding
  it to the safelist too.
- **Breakpoint-gated layout components need wide viewports.** `Sidebar` is
  `hidden lg:flex`, so its card renders blank below 1024px — `cfg.overrides.Sidebar.viewport`
  is `1120x760`. `MobileNav` is `lg:hidden` and must stay narrow (`520x260`).
- **`AppLogo` uses `next/image` with `/logo.png` (5.2 MB).** Too large to inline,
  and the design project has no `/public`, so the shim maps `/logo.png`, `/icon.png`
  and `/logo.svg` to `public/logo.svg` inlined as a data URI. Same artwork; if the
  PNG mark ever diverges from the SVG, previews will show the SVG.
- **Fonts** are the real Inter woff2 files `next/font/google` downloaded into
  `.next/static/media`, copied to `.design-sync/fonts/` with the generated
  `@font-face` rules (`cfg.extraFonts`). They are committed, so a fresh clone does
  not need a Next build. Regenerate from `.next/dev/static/chunks/*inter*.css` if
  the font config changes.
- **Grades/config coupling:** changing `cfg.overrides` invalidates the stamped
  build — `package-capture.mjs` then fails `[CONFIG_STALE]` and you must run the
  full `package-build.mjs` (not `preview-rebuild.mjs`) before capturing.
- **Scoped `package-capture.mjs --components X` prunes other components' review
  sheets.** Only the scoped sheets survive on disk; re-capture a component before
  grading it rather than trusting a sheet from an earlier run.

## Known render warns (triaged, expect them again)

- `[RENDER_THIN] components/primitives/Dialog/Dialog.html: rendered height 1px` —
  benign. The popup is `position: fixed` inside a portal, so the measured root has
  no height; the screenshots show both dialog cells rendering correctly.

## Re-sync risks — what can silently go stale

- **`cfg.dtsPropsFor` is a hand-maintained mirror of component props.** Nothing
  fails if a prop is added, renamed or retyped in `src/components/**` — the
  uploaded `.d.ts` just lies to the design agent. On every re-sync, diff the props
  bodies against the sources listed in `cfg.componentSrcMap`.
- **`ds-entry.tsx` does not track new components.** A component added to
  `src/components/**` is invisible to the sync until it is exported here.
- **The safelist can drift from the token set.** New tokens in `globals.css` (or
  new families) are not automatically safelisted; utilities for them will be
  missing from the shipped CSS unless the app itself already uses them.
- **`.next/` is the font source.** It is gitignored; the copies in
  `.design-sync/fonts/` are the durable artefact. Do not delete them expecting a
  rebuild to restore them.
- **Playwright/chromium live in the gitignored `.ds-sync/`** — a fresh clone must
  reinstall them (`npm i playwright && npx playwright install chromium` inside
  `.ds-sync/`) before the render check can run.
- **Only 8 of 20 components have authored `.prompt.md` docs** (`.design-sync/docs/`,
  the primitives + brand). The other 12 get docs synthesized from
  `cfg.dtsPropsFor` + preview examples, which is adequate but thinner. Authoring
  `.design-sync/docs/<Name>.md` for the app components (with `category:` frontmatter)
  is the cheapest quality win on a future re-sync.
- **Not verified:** dark mode. Every preview and grade is light-theme only; the
  `.dark` token set ships in the CSS but no card exercises it.
