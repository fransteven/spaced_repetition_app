---
category: Primitives
---

Dialog — modal primitive (shadcn over `@base-ui/react/dialog`). Exported as parts, not a single component; compose them.

```jsx
const { Dialog, DialogTrigger, DialogPortal, DialogBackdrop, DialogPopup,
        DialogTitle, DialogDescription, DialogClose, Button } = window.NeuroCards;

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger render={<Button variant="outline">Edit deck</Button>} />
  <DialogPortal>
    <DialogBackdrop />
    <DialogPopup>
      <DialogTitle>Edit deck</DialogTitle>
      <DialogDescription>Rename the deck or change its subject.</DialogDescription>
      {/* form fields */}
      <div className="flex justify-end gap-3">
        <DialogClose render={<Button variant="ghost">Cancel</Button>} />
        <Button>Save changes</Button>
      </div>
    </DialogPopup>
  </DialogPortal>
</Dialog>
```

Parts: `Dialog` (root, owns `open` / `defaultOpen` / `onOpenChange`), `DialogTrigger`, `DialogPortal`, `DialogBackdrop` (`bg-black/40 backdrop-blur-sm`), `DialogPopup` (centred, `bg-surface-container-lowest`, `rounded-xl p-6`, ambient shadow — max width `sm:max-w-md`), `DialogTitle` (`text-xl font-bold`), `DialogDescription` (`text-sm text-on-surface-variant`), `DialogClose`.

`DialogTrigger` and `DialogClose` take base-ui's `render` prop — pass a `Button` element rather than nesting a button inside them.

The popup already carries its own padding, radius, background and shadow; add only layout classes (`space-y-4`, `flex`) inside it. Widen with `className="sm:max-w-lg"` on `DialogPopup`.
