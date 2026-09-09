const CACHE_NAME = "hao-detail-automation-v20260909-stable1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./START_HERE.html",
  "./project-form.html",
  "./customer-review.html",
  "./customer-submissions.html",
  "./track.html",
  "./system-status.html",
  "./styles.css",
  "./admin-dark.css",
  "./customer-form-v11.css",
  "./app.js",
  "./figma-workflow.js",
  "./concept-process.js",
  "./data/company-reference-dataset.js",
  "./planning/figma-workspace.js",
  "./project-form.js",
  "./workflow-core.js",
  "./intake-triage.js",
  "./customer-submissions.js",
  "./submission-sync.js",
  "./customer-file-store.js",
  "./mvp-codex-package.js",
  "./packaging-bridge.js",
  "./pwa-install.js",
  "./hao-config.js",
  "./data/public-customer-projects.js",
  "./assets/app-icons/hao-192.png",
  "./assets/app-icons/hao-512.png",
  "./planning/figma-workspace.html",
  "./planning/figma-workspace.css",
  "./assets/planning/generic-planning-v1.svg"
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
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || event.request.headers.has("Authorization")) return;
  const isDocument = event.request.mode === "navigate";
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {}));
        }
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
