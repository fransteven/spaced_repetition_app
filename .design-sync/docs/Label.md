---
category: Primitives
---

Label — form label primitive. `text-sm font-medium`, flex row with `gap-2` so an icon or hint chip can sit beside the text. Dims automatically when its group or peer control is disabled.

Always bind it with `htmlFor` pointing at the control's `id`.

```jsx
const { Label, Input } = window.NeuroCards;

<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```
