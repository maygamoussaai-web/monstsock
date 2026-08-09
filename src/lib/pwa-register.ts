// Enregistrement du service worker MonStock (public/push-sw.js).
//
// Ce même fichier gère à la fois les notifications push (opt-in, activées
// depuis le profil) et la mise en cache de l'app pour le mode hors ligne. On
// l'enregistre donc dès le démarrage pour tout le monde.
//
// Volontairement inactif dans l'éditeur Lovable : un service worker y mettrait
// en cache une version figée du bundle et donnerait l'impression que le code
// ne se met plus à jour. On détecte l'éditeur en vérifiant si l'app tourne
// dans un cadre (iframe) intégré à une autre page — c'est le cas dans
// l'éditeur, jamais sur le site publié ou dans l'app installée. On n'utilise
// plus le mode de build (import.meta.env.PROD) pour cette détection : il s'est
// avéré peu fiable pour distinguer le site publié de l'éditeur, ce qui
// empêchait le service worker de s'enregistrer même sur le vrai site.
function isInsideEditorFrame(): boolean {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    // Une exception ici (accès cross-origin à window.top) signifie qu'on est
    // dans un cadre, donc probablement l'éditeur — on reste prudent.
    return true;
  }
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (isInsideEditorFrame()) {
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