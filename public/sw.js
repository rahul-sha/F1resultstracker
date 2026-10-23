// Minimal service worker: present only so browsers treat Grid Walk as
// installable. It does not cache anything — race data changes often, so
// every request is left to go to the network as normal.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: let the browser handle every request normally.
});
