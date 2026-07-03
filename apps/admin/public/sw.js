/**
 * Tandyr service worker — hand-rolled, zero dependencies.
 *
 * Why not Serwist: `next build` runs on Turbopack, and `@serwist/next`
 * injects its precache manifest through a webpack plugin that Turbopack
 * never executes. The Turbopack-specific path (`@serwist/turbopack`)
 * requires esbuild as a dependency and serves the SW from a dynamic
 * route handler. A minimal hand-written worker covers our needs
 * (app-shell precache, network-first navigations, offline fallback)
 * without any of that.
 *
 * Bump CACHE_VERSION whenever the shell pages change shape.
 */
const CACHE_VERSION = 'v2';
const SHELL_CACHE = `tandyr-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `tandyr-runtime-${CACHE_VERSION}`;
// Only the offline fallback. Never precache authenticated pages: addAll
// sends cookies, so a logged-in install would snapshot one user's HTML
// into Cache Storage (and a logged-out one would store /login junk).
const SHELL_URLS = ['/offline'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET only: POSTs (server actions, mutations) pass straight through.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never touch cross-origin requests (Supabase API/storage) or our API routes.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, offline fallback page when the network is down.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline').then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const refresh = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => undefined);
        return cached ?? refresh.then((response) => response ?? Response.error());
      }),
    );
  }
});
