const CACHE_NAME = "ruangku-shell-v1";
const SHELL_URL = new URL("/", self.location.origin).href;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    await self.skipWaiting();
    try {
      const response = await fetch(SHELL_URL, { credentials: "omit" });
      const cacheControl = response.headers.get("cache-control") ?? "";
      if (
        response.ok &&
        response.headers.get("content-type")?.includes("text/html") &&
        !/\b(private|no-store)\b/i.test(cacheControl)
      ) {
        const cache = await caches.open(CACHE_NAME);
        const html = await response.clone().text();
        await cache.put(SHELL_URL, response);
        const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
          .map((match) => new URL(match[1], self.location.origin))
          .filter((assetUrl) =>
            assetUrl.origin === self.location.origin &&
            (assetUrl.pathname.startsWith("/_next/static/") ||
              /\.(?:css|js|woff2?|ttf|png|svg|ico|webp)$/i.test(assetUrl.pathname)),
          )
          .map((assetUrl) => assetUrl.href);
        await Promise.all(assetUrls.map(async (assetUrl) => {
          try {
            const assetResponse = await fetch(assetUrl, { credentials: "omit" });
            if (assetResponse.ok) await cache.put(assetUrl, assetResponse);
          } catch (error) {
            console.warn("Gagal menyimpan aset PWA untuk penggunaan offline:", error);
          }
        }));
      }
    } catch (error) {
      console.warn("Gagal menyimpan halaman Ruangku untuk penggunaan offline:", error);
    }
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
        const response = await fetch(request);
        const cacheControl = response.headers.get("cache-control") ?? "";
        if (
          url.pathname === "/" &&
          !url.search &&
          !request.headers.has("cookie") &&
          response.ok &&
          response.headers.get("content-type")?.includes("text/html") &&
          !/\b(private|no-store)\b/i.test(cacheControl)
        ) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(SHELL_URL, response.clone());
        }
        return response;
      } catch (error) {
        if (url.pathname === "/" && !url.search) {
          const cachedShell = await caches.match(SHELL_URL);
          if (cachedShell) return cachedShell;
        }
        throw error;
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
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;

      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
