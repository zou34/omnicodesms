// Minimal service worker — required by some browsers' installability
// criteria. Deliberately does not cache/serve stale responses: the
// dashboard, admin panel, and auth routes all need fresh, per-request,
// authenticated data, so an aggressive cache-first strategy here would
// actively break the app rather than speed it up.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
