const CACHE_NAME = "ruangku-shell-v3";
const OFFLINE_URL = new URL("/offline.html", self.location.origin).href;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([OFFLINE_URL, new URL("/ruangku-logo.png", self.location.origin).href]);
    } catch (error) {
      console.error("Gagal menyimpan halaman offline Ruangku:", error);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith("ruangku-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/sw.js" ||
    request.headers.has("authorization")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const offlinePage = await caches.match(OFFLINE_URL);
        if (offlinePage) return offlinePage;
        return Response.error();
      }
    })());
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|woff2?|ttf|png|svg|ico|webp)$/i.test(url.pathname)
  ) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
        throw error;
      }
    })());
  }
});
