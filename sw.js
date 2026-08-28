const CACHE_NAME = "hao-detail-automation-v20260828-server-auth4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./START_HERE.html",
  "./project-form.html",
  "./customer-review.html",
  "./track.html",
  "./system-status.html",
  "./styles.css",
  "./admin-dark.css",
  "./customer-form-v11.css",
  "./app.js",
  "./project-form.js",
  "./workflow-core.js",
  "./submission-sync.js",
  "./customer-file-store.js",
  "./mvp-codex-package.js",
  "./packaging-bridge.js",
  "./pwa-install.js",
  "./hao-config.js",
  "./data/public-customer-projects.js",
  "./assets/app-icons/hao-192.png",
  "./assets/app-icons/hao-512.png",
  "./planning/saengjeup-v1.html",
  "./planning/test-connection-v1.html",
  "./assets/planning/saengjeup-planning-v1.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("hao-detail-automation-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  const isDocument = event.request.mode === "navigate";
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request, { ignoreSearch: isDocument });
        if (cached) return cached;
        if (isDocument) return caches.match("./index.html");
        return new Response("오프라인 상태이며 이 자료는 아직 저장되지 않았습니다.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      })
  );
});
