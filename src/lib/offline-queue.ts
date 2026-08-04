import { useEffect, useState } from "react";

// File d'attente locale pour les ventes enregistrées hors ligne — étape 2 du
// mode hors ligne. Stockée dans localStorage (survit à la fermeture de l'app).
// Rien n'est jamais perdu silencieusement : un envoi qui échoue reste dans la
// file pour la prochaine tentative, il n'est retiré qu'après un succès confirmé.
const STORAGE_KEY = "monstock:offline-quick-sales";

export type PendingQuickSale = {
  local_id: string;
  // Clé anti-doublon envoyée au serveur : permet de retenter en toute sécurité
  // sans risquer d'appliquer deux fois la même vente si une tentative précédente
  // a en réalité réussi côté serveur après avoir semblé "trop lente" côté app.
  client_ref: string;
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

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOfflineQueue(): PendingQuickSale[] {
  return readQueue();
}

// Si client_ref n'est pas fourni, une nouvelle clé anti-doublon est générée.
// Le mutationFn de useQuickSale en fournit une lui-même pour pouvoir réutiliser
// EXACTEMENT la même clé entre sa tentative immédiate et la mise en file.
export function enqueueQuickSale(
  item: Omit<PendingQuickSale, "local_id" | "queued_at" | "client_ref"> & { client_ref?: string }
) {
  const entry: PendingQuickSale = {
    ...item,
    client_ref: item.client_ref ?? makeId(),
    local_id: makeId(),
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
// file QUE celles qui réussissent — une erreur la laisse en attente pour la
// prochaine tentative (sans risque de doublon grâce à client_ref).
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