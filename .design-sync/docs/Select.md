---
category: Primitives
---

Select — dropdown primitive (shadcn over `@base-ui/react/select`). Composed from parts; the root is base-ui's `Select.Root` re-exported.

```jsx
const { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup,
        SelectLabel, SelectItem, SelectSeparator } = window.NeuroCards;

<Select defaultValue="science">
  <SelectTrigger className="w-56">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Subject</SelectLabel>
      <SelectItem value="english">English</SelectItem>
      <SelectItem value="science">Science</SelectItem>
      <SelectItem value="math">Math</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

Parts: `Select` (root — `value`/`defaultValue`/`onValueChange`/`multiple`/`open`), `SelectTrigger` (`size?: 'sm' | 'default'`, renders its own chevron), `SelectValue` (shows the selected item's text), `SelectContent` (portalled + positioned popup; accepts `side`, `sideOffset`, `align`, `alignOffset`, `alignItemWithTrigger`), `SelectGroup`, `SelectLabel` (group heading), `SelectItem` (`value`, renders its own check indicator), `SelectSeparator`, and `SelectScrollUpButton` / `SelectScrollDownButton` (rendered by `SelectContent` automatically).

The trigger is `w-fit` by default — give it an explicit width (`className="w-56"`) inside forms. Subject selects in this app use the deck subject enum: `english` · `science` · `math` · `history` · `custom`.
