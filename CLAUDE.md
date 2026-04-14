# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
```

No test runner is configured.

## Architecture

**Next.js 16 App Router** — `src/app/` uses React Server Components by default. Read `node_modules/next/dist/docs/01-app/` before writing any routing or data-fetching code; this version has breaking changes from prior releases.

**Tailwind v4** — config is CSS-first. There is no `tailwind.config.js`. All theme tokens live in `src/app/globals.css` under `@theme inline`. To add/change design tokens, edit that block — not a config file.

**shadcn + @base-ui/react** — shadcn here uses `@base-ui/react` as the primitive layer (not Radix UI). Components live in `src/components/ui/`. Use `cn()` from `src/lib/utils.ts` for class merging.

**Forms** — all form state and validation via `react-hook-form` + `zod`. No exceptions.

**CSS variables** — color tokens are defined in `:root` in `globals.css` and referenced as `var(--token-name)` in Tailwind classes. The `@theme inline` block maps them to Tailwind's color scale.

---

# UI Design Rules — MANDATORY

**Before ANY UI change, read `DESIGN.md` in full.**

- Colors: use only tokens defined in DESIGN.md. No arbitrary hex values.
- Typography: use only the scale defined in DESIGN.md (heading, body, caption, etc).
- Buttons: match variants exactly (primary, secondary, destructive) as specified.
- Spacing/layout: follow page padding, card, and grid rules from DESIGN.md.
- Components: prefer shadcn components. Apply DESIGN.md variants, not defaults.
- Forms: use react-hook-form + zod for all form state and validation.
- Consistency check: after writing any component, verify it matches DESIGN.md tokens before declaring done.

If DESIGN.md is incomplete or ambiguous for a specific case, ask before inventing a pattern.
