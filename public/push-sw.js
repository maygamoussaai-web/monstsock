// public/push-sw.js
// Service worker MonStock : notifications push (existant) + étape 1 du mode
// hors ligne (nouveau, ci-dessous). Un seul service worker peut contrôler
// l'app à la fois, donc les deux vivent dans ce même fichier.

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
// Mode hors ligne — étape 1 : permettre uniquement d'OUVRIR l'app sans réseau.
// Stratégie "réseau d'abord" : si le réseau répond, on l'utilise TOUJOURS et on
// met le cache à jour en arrière-plan ; le cache n'intervient QUE si le réseau
// échoue totalement. Volontairement conservateur : on ne veut jamais resservir
// une version figée quand le réseau est disponible.
// ─────────────────────────────────────────────────────────────────────────────
const SHELL_CACHE = "monstock-shell-v1";

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

  // Seulement les GET same-origin. Tout le reste (Supabase, appels POST,
  // fonctions Edge...) part directement au réseau, sans jamais passer par un
  // cache — ces données doivent toujours être fraîches.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        throw new Error("offline-and-not-cached");
      })
  );
});