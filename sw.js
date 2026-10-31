/* CCAR-F Question Bank — offline cache. Bump VERSION on every deploy. */
const VERSION = "v9";
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
  "questions/domain1-multi.js",
  "questions/domain2-multi.js",
  "questions/domain3-multi.js",
  "questions/domain4-multi.js",
  "questions/domain5-multi.js",
  "exams/index.js",
];
/* Exam question files are deliberately not precached: they are large and
 * only needed once an exam is opened. The fetch handler caches them then. */

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
  /* Only successful responses are cached: a 404 or a captive-portal page
   * served during a deploy must not replace a good cached file. */
  const store = (request, res) => {
    if (res && res.ok && res.type === "basic") {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
    }
    return res;
  };

  const offlineFallback = (request) =>
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      if (request.mode === "navigate") return caches.match("index.html");
      return Response.error();
    });

  if (sameOrigin) {
    e.respondWith(
      fetch(e.request, { cache: "no-cache" })
        .then((res) => (res && res.ok ? store(e.request, res) : offlineFallback(e.request).then((hit) => hit || res)))
        .catch(() => offlineFallback(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request)
            .then((res) => store(e.request, res))
            .catch(() => Response.error())
      )
    );
  }
});
