// Enregistrement du service worker MonStock (public/push-sw.js).
//
// Ce même fichier gère à la fois les notifications push (opt-in, activées
// depuis le profil) et la mise en cache de l'app pour l'étape 1 du mode hors
// ligne (permettre d'OUVRIR l'app sans réseau). On l'enregistre donc dès le
// démarrage pour tout le monde, pas seulement les personnes qui activent les
// notifications.
//
// Volontairement inactif en dehors d'un build de production : dans l'éditeur
// Lovable (serveur de dev), un service worker peut mettre en cache une version
// figée du bundle Vite et donner l'impression que le code ne se met plus à
// jour — exactement le problème déjà rencontré une fois sur ce projet.
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (!import.meta.env.PROD) {
    ensureNoStaleServiceWorker();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/push-sw.js").catch(() => {
      // Échec silencieux : l'app doit continuer à fonctionner normalement même
      // si le service worker ne peut pas s'installer.
    });
  });
}

export function ensureNoStaleServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => {
        if (r.scope.startsWith(window.location.origin + "/")) r.unregister();
      });
    });
  } catch {}
}