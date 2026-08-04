---
category: Brand
---

AppLogo — the NeuroCards mark plus wordmark. Used in the top nav (`size="sm"`), the desktop sidebar (`size="md"`), and on the auth screens (`size="lg"`).

```jsx
const { AppLogo } = window.NeuroCards;

<AppLogo size="md" href="/" />          // links home
<AppLogo size="sm" showText={false} />  // mark only
```

Pass `href` to make the whole lockup a link; omit it inside something that is already a link. Do not re-typeset the wordmark — the weight/tracking per size is part of the component.
