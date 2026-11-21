/** Instructions to paste into any LLM so the canvas it returns works inside NeuroCards. */
export const CANVAS_PROMPT = `Explain the idea below as an interactive visual canvas.

Return ONE self-contained HTML file and nothing else:
- All CSS and JavaScript inline. External scripts only from cdnjs.cloudflare.com, cdn.jsdelivr.net, unpkg.com, cdn.tailwindcss.com or esm.sh.
- No fetch/XHR/WebSocket calls, no forms, no pop-ups. Data must be inside the file.
- localStorage is temporary (cleared on reload); don't rely on it.
- Works on a phone (viewport meta, touch-friendly controls) and in light and dark mode.
- A clear <title>, and under 2 MB.

Idea: `;
