// Bustrip Driver — service worker
// Only the app shell (this HTML file, manifest, icons) is cached, so the
// app can still open when offline. Firebase/Firestore requests are never
// intercepted here — they always go straight to the network, so drivers
// never see stale trip data, requests, or earnings.

const CACHE_NAME = "bustrip-driver-v1";
const APP_SHELL = [
  "./driver.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only manage same-origin navigations and our own app-shell files.
  // Everything else (Firebase Auth/Firestore, Google's CDN scripts, etc.)
  // is left completely alone — no caching, straight to the network.
  const isSameOrigin = url.origin === self.location.origin;
  const isShellFile = APP_SHELL.some((p) => url.pathname.endsWith(p.replace("./", "/")));
  const isNavigation = req.mode === "navigate";

  if (!isSameOrigin || !(isShellFile || isNavigation)) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("./driver.html"))
      )
  );
});
