/* CCAR-F Question Bank — offline cache. Bump VERSION on every deploy. */
const VERSION = "v5";
const CACHE = "ccarf-qb-" + VERSION;
const CORE = [
  "./",
  "index.html",
  "app.js",
  "config.js",
  "sync.js",
  "icon.svg",
  "manifest.webmanifest",
  "questions/domain1.js",
  "questions/domain2.js",
  "questions/domain3.js",
  "questions/domain4.js",
  "questions/domain5.js",
  "questions/domain1-set2.js",
  "questions/domain2-set2.js",
  "questions/domain3-set2.js",
  "questions/domain4-set2.js",
  "questions/domain5-set2.js",
  "questions/extra-set.js",
  "questions/domain1-gap.js",
  "questions/domain2-gap.js",
  "questions/domain3-gap.js",
  "questions/domain4-gap.js",
  "questions/domain5-gap.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network-first for same-origin app files (so deploys show up), falling back
 * to cache offline. cache:"no-cache" bypasses the browser's HTTP cache and
 * revalidates with the server (ETag 304 when unchanged), so a normal reload
 * picks up new deploys instead of waiting out GitHub Pages' max-age=600.
 * Cache-first for fonts and other cross-origin assets. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  if (sameOrigin) {
    e.respondWith(
      fetch(e.request, { cache: "no-cache" })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return res;
          })
      )
    );
  }
});
