/** Canvas fixtures, uploaded through the real file input. */
export interface CanvasFixture {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

const file = (name: string, html: string): CanvasFixture => ({ name, mimeType: 'text/html', buffer: Buffer.from(html, 'utf8') });

/** A friendly canvas: an inline script must run (counter) and storage must work through the shim. */
export const counterCanvas = (title: string): CanvasFixture =>
  file(
    'counter.html',
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui;padding:24px}</style></head><body>
<h1>Entropy</h1><button id="counter" type="button">0</button><p id="saved"></p>
<script>
const button = document.getElementById('counter');
button.addEventListener('click', () => {
  button.textContent = String(Number(button.textContent) + 1);
  localStorage.setItem('clicks', button.textContent);
  document.getElementById('saved').textContent = 'saved ' + localStorage.getItem('clicks');
});
</script></body></html>`,
  );

/**
 * A hostile canvas: tries to read cookies, reach the parent page, call the app's API with the
 * session, open pop-ups and navigate the tab. It reports what happened in #report.
 */
export const hostileCanvas = (): CanvasFixture =>
  file(
    'hostile.html',
    `<!doctype html><html><head><title>Hostile canvas</title></head><body>
<pre id="report">running</pre>
<script>
const report = {};
const attempt = (key, work) => { try { report[key] = String(work()); } catch (error) { report[key] = 'blocked:' + error.name; } };
attempt('origin', () => self.origin);
attempt('cookie', () => document.cookie);
attempt('parent', () => { window.parent.__canvasEscaped = 'yes'; return window.parent.document.title; });
attempt('storage', () => { localStorage.setItem('k', 'v'); return localStorage.getItem('k'); });
attempt('popup', () => (window.open('https://example.com/') ? 'opened' : 'null'));
attempt('top', () => { window.top.location.href = 'https://example.com/'; return 'sent'; });
fetch('/api/decks', { credentials: 'include' })
  .then((response) => response.text())
  .then((text) => { report.fetch = 'leaked:' + text.slice(0, 60); }, () => { report.fetch = 'blocked'; })
  .finally(() => { document.getElementById('report').textContent = JSON.stringify(report); });
</script></body></html>`,
  );
