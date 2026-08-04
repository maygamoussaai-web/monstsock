// public/push-sw.js
// Service worker MonStock : notifications push (existant) + mode hors ligne.

// ─────────────────────────────────────────────────────────────────────────────
// Notifications push (inchangé)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "MonStock", body: "Nouvelle notification", url: "/dashboard" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // payload non-JSON : on garde les valeurs par défaut
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Mode hors ligne : permettre d'OUVRIR/NAVIGUER dans l'app sans réseau.
// Stratégie "réseau d'abord, avec délai court" : on tente le réseau, mais on
// ne fait jamais attendre plus de quelques secondes — sur une connexion coupée
// OU juste lente/instable (pas seulement une vraie coupure), on bascule vite
// sur le cache plutôt que de laisser le navigateur attendre son propre délai
// d'expiration (souvent 20-30s), qui donnait l'impression que l'app était
// figée.
// ─────────────────────────────────────────────────────────────────────────────
const SHELL_CACHE = "monstock-shell-v1";
const NETWORK_TIMEOUT_MS = 3000;

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("network-timeout")), ms));
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const response = await Promise.race([fetch(request), timeout(NETWORK_TIMEOUT_MS)]);
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      } catch {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        throw new Error("offline-and-not-cached");
      }
    })()
  );
});