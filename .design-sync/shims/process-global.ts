// Imported FIRST by ds-entry.tsx so it evaluates before any component module.
// Some bundled dependencies read bare `process.env.*` at module scope; the
// converter only defines `process.env.NODE_ENV`, so without this the whole IIFE
// dies with "process is not defined" and window.NeuroCards never gets assigned.
const g = globalThis as unknown as {
  process?: { env: Record<string, string | undefined>; platform?: string };
};

if (!g.process) {
  g.process = { env: { NODE_ENV: 'development' }, platform: 'browser' };
} else if (!g.process.env) {
  g.process.env = { NODE_ENV: 'development' };
}

export {};
