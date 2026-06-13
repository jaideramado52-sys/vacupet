/* VacuPet — Service Worker (Fase 2 PWA) */
const CACHE = "vacupet-v1";
const CORE = [
  "./VacuPet.html",
  "./manifest.webmanifest",
  "./supabase-config.js",
  "./icon.svg",
  "./icon-maskable.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // La config de Supabase va NETWORK-FIRST (para que los cambios de claves
  // se reflejen sin trucos), con caché de respaldo si no hay conexión.
  if (req.url.includes("supabase-config.js")) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  // La app (navegación/HTML) va NETWORK-FIRST: siempre la última versión online,
  // con caché de respaldo si no hay conexión (offline).
  if (req.mode === "navigate" || req.url.includes("VacuPet.html")) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((h) => h || caches.match("./VacuPet.html")))
    );
    return;
  }
  // Cache-first para el resto del shell; cae a red y, si falla, sirve lo cacheado.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req)
        .then((res) => {
          try {
            const url = new URL(req.url);
            // Cachea recursos propios y la librería de QR (cargada del CDN).
            if (url.origin === location.origin || url.href.includes("qrcode-generator") || url.href.includes("supabase")) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
          } catch (_) {}
          return res;
        })
        .catch(() => caches.match("./VacuPet.html"))
    )
  );
});

// Recibe notificaciones push del servidor (recordatorios de vacunas/desparasitación).
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data ? e.data.text() : "" }; }
  const title = data.title || "VacuPet";
  const options = {
    body: data.body || "Tu mascota tiene un recordatorio próximo.",
    icon: "./icon.svg",
    badge: "./icon.svg",
    tag: data.tag || "vacupet-reminder",
    data: { url: data.url || "./VacuPet.html" },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Al tocar una notificación, enfoca o abre la app.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./VacuPet.html";
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((cs) => {
      for (const c of cs) { if ("focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
