---
category: Primitives
---

Textarea — multi-line field primitive. Auto-grows with content (`field-sizing-content`, `min-h-16`) and matches `Input`'s border, radius, and focus ring.

Used for deck descriptions and for card front/back authoring (the markdown that `MarkdownContent` renders back).

```jsx
const { Label, Textarea } = window.NeuroCards;

<div className="space-y-2">
  <Label htmlFor="answer">Answer</Label>
  <Textarea id="answer" rows={4} placeholder="Markdown supported — **bold**, `code`, tables" />
</div>
```

`aria-invalid` gives the destructive border + ring; never restyle the border directly.
