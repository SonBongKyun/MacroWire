// Service worker — DISABLED.
//
// Earlier versions of this app pre-cached "/" on install, so when the root
// route became the landing page (and the app moved to /app), users with the
// old SW installed kept seeing the stale app shell at "/". This file now
// self-unregisters and clears every cache on every install / activate, so
// once a user's browser hits this URL the old SW is completely gone.

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      // Detach this SW from every client and refuse to handle any future fetches.
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url).catch(() => {});
      }
      await self.registration.unregister();
    })()
  );
});

// No fetch handler — let everything go to the network.
