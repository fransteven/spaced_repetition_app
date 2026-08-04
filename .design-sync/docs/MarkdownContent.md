---
category: Primitives
---

MarkdownContent — renders flashcard text. `react-markdown` + `remark-gfm` (tables, strikethrough, task lists) + `rehype-highlight` (fenced-code syntax colouring, github-dark theme).

This is how card fronts and backs are displayed during study, and how LLM exam feedback is rendered. Never render card text as raw HTML.

```jsx
const { MarkdownContent } = window.NeuroCards;

<MarkdownContent size="sm" content={card.front} />
<MarkdownContent content={card.back} />
```

`size="sm"` is the question (front) scale; `size="md"` (default) is the answer scale — `body-lg` legibility for high-intensity recall, per DESIGN.md.
