// ⚠ Bumping CACHE_NAME forces all clients to drop the previous cache
// (which contained the old app shell at "/" before the landing/app split).
const CACHE_NAME = "macrowire-v3";
// Only pre-cache assets that won't change shape — never the HTML routes,
// otherwise stale shell can outlive a deploy.
const STATIC_ASSETS = ["/manifest.json", "/icon.svg"];
const API_CACHE = "macrowire-api-v1";
const MAX_API_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop every previous-version cache so the old "/" shell is gone
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-first for API with fallback cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET API responses
          if (response.ok && event.request.method === "GET") {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: serve from API cache
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Return offline JSON response
            return new Response(
              JSON.stringify({ data: [], hasMore: false, nextCursor: null, error: "오프라인 상태입니다" }),
              { headers: { "Content-Type": "application/json" }, status: 503 }
            );
          });
        })
    );
    return;
  }

  // Cache-first for static assets + Next.js bundles
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".json")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML / navigation requests — network only, no caching.
  // Caching shells caused the landing/app split to ghost the old root.
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          "<!doctype html><meta charset='utf-8'><title>MacroWire — 오프라인</title>" +
            "<body style='background:#0D0D0F;color:#EBEBEB;font-family:Pretendard,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center'>" +
            "<div><div style='font-size:14px;color:#C9A96E;letter-spacing:.16em;margin-bottom:12px'>OFFLINE</div>" +
            "<div style='font-size:18px'>네트워크에 연결되지 않았습니다.</div></div>" +
            "</body>",
          { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
        )
    )
  );
});

// Periodic cleanup of old API cache entries
self.addEventListener("message", (event) => {
  if (event.data === "cleanup-cache") {
    caches.open(API_CACHE).then((cache) => {
      cache.keys().then((keys) => {
        keys.forEach((request) => {
          cache.match(request).then((response) => {
            if (response) {
              const dateHeader = response.headers.get("date");
              if (dateHeader) {
                const age = Date.now() - new Date(dateHeader).getTime();
                if (age > MAX_API_CACHE_AGE) {
                  cache.delete(request);
                }
              }
            }
          });
        });
      });
    });
  }
});
