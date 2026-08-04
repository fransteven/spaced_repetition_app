---
category: Primitives
---

Input — text field primitive (shadcn over `@base-ui/react/input`). Standard `input` props; the styling is fixed (`h-8`, `rounded-lg`, `border-input`, transparent background, `focus-visible` ring in `--ring`).

Pair it with `Label` via `htmlFor`/`id`. Error state is `aria-invalid` — it swaps the border and ring to `destructive`; do not hand-colour the border.

```jsx
const { Label, Input } = window.NeuroCards;

<div className="space-y-2">
  <Label htmlFor="deck-name">Deck name</Label>
  <Input id="deck-name" placeholder="e.g. Organic Chemistry" />
</div>
```

All forms in this app are `react-hook-form` + `zod`; spread `register('field')` onto the input.
