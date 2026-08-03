import { useEffect, useState } from "react";

// File d'attente locale pour les ventes enregistrées hors ligne — étape 2 du
// mode hors ligne. Volontairement limitée à UNE seule action (la vente rapide,
// la plus fréquente et la plus simple), comme convenu.
//
// Stockée dans localStorage (survit à la fermeture de l'app, pas seulement à
// un rafraîchissement de page). Rien n'est jamais perdu silencieusement : un
// envoi qui échoue reste dans la file pour la prochaine tentative, il n'est
// retiré qu'après un succès confirmé côté serveur.
const STORAGE_KEY = "monstock:offline-quick-sales";

export type PendingQuickSale = {
  local_id: string;
  bakery_id: string;
  product_id: string;
  product_name: string;
  quantity_sold: number;
  unit_price: number;
  kept_quantity: number;
  thrown_quantity: number;
  queued_at: string;
};

function readQueue(): PendingQuickSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingQuickSale[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: PendingQuickSale[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Stockage indisponible (navigation privée, quota plein...) : la vente reste
    // en mémoire pour cette session mais ne survivra pas à une fermeture d'app.
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}

export function getOfflineQueue(): PendingQuickSale[] {
  return readQueue();
}

export function enqueueQuickSale(item: Omit<PendingQuickSale, "local_id" | "queued_at">) {
  const entry: PendingQuickSale = {
    ...item,
    local_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queued_at: new Date().toISOString(),
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  notify();
  return entry;
}

function removeFromQueue(localId: string) {
  const queue = readQueue().filter((q) => q.local_id !== localId);
  writeQueue(queue);
  notify();
}

// Tente d'envoyer chaque vente en attente au serveur via sendFn. Ne retire de la
// file QUE celles qui réussissent — une erreur (réseau encore instable, etc.)
// la laisse en attente pour la prochaine tentative.
export async function syncOfflineQueue(
  sendFn: (item: PendingQuickSale) => Promise<void>
): Promise<{ synced: number; failed: number }> {
  const queue = readQueue();
  let synced = 0;
  let failed = 0;
  for (const item of queue) {
    try {
      await sendFn(item);
      removeFromQueue(item.local_id);
      synced++;
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}

// Hook réactif : se remet à jour dès que la file change (ajout ou
// synchronisation), sans avoir besoin de rafraîchir la page.
export function useOfflineQueue() {
  const [queue, setQueue] = useState<PendingQuickSale[]>(() => readQueue());
  useEffect(() => {
    const listener = () => setQueue(readQueue());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return queue;
}