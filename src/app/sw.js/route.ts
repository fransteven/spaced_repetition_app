import { buildServiceWorkerSource } from '@/lib/offline/sw-source';

/**
 * GET /sw.js — the offline service worker (docs/plans/offline-mode.md).
 *
 * `force-static` prerenders this response once at `next build`, so the module-level timestamp below is
 * frozen per build: every instance serves the same bytes, and the next deployment serves new ones,
 * which is what makes the browser install the new worker and drop the old `nc-shell-*` cache.
 * The commit SHA (Vercel) only makes the id readable; the timestamp keeps redeploys of the same commit
 * (new env, new chunk hashes) distinct. No auth, no DB, no request data.
 */
export const dynamic = 'force-static';

const BUILD_ID = [
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'local',
  Date.now().toString(36),
].join('-');

export function GET(): Response {
  return new Response(buildServiceWorkerSource(BUILD_ID), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
