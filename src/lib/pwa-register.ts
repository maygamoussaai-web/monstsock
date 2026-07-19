// PWA installability is provided by public/manifest.webmanifest.
// No service worker is registered — Lovable previews break with stale SWs,
// and offline is not requested. If a legacy SW is present, unregister it here.
export function ensureNoStaleServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => {
        // Only unregister our own scope; leave third-party workers alone.
        if (r.scope.startsWith(window.location.origin + "/")) r.unregister();
      });
    });
  } catch {}
}
