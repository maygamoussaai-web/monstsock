import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// File d'attente locale GÉNÉRIQUE des actions d'écriture (mode hors ligne).
//
// Toute action d'écriture de l'app passe par cette file lorsque le réseau est
// absent ou trop lent. Rien n'est jamais perdu silencieusement :
//  • une action n'est retirée qu'après confirmation du serveur ;
//  • une erreur réseau la laisse en attente (statut "pending") ;
//  • une erreur métier définitive la passe en "failed" et elle reste visible,
//    avec le message du serveur, jusqu'à ce que l'utilisateur réessaie ou
//    l'abandonne explicitement.
//
// Chaque action porte un client_ref (uuid) transmis au serveur : les fonctions
// Postgres refusent d'appliquer deux fois la même référence, donc un rejeu est
// toujours sans risque de doublon.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "monstock:offline-queue";
const LEGACY_SALES_KEY = "monstock:offline-quick-sales";

export type QueuedActionKind =
  | "raw_material.create"
  | "raw_material.update"
  | "raw_material.archive"
  | "unit.create"
  | "unit.update"
  | "unit.delete"
  | "purchase.create"
  | "product.create"
  | "product.update"
  | "product.archive"
  | "recipe.upsert"
  | "recipe.delete"
  | "template.create"
  | "template.delete"
  | "batch.create"
  | "sale.quick"
  | "sale.simple"
  | "loss.record"
  | "sales_session.create"
  | "sales_session.close"
  | "bakery.update";

export type QueuedAction = {
  local_id: string;
  client_ref: string;
  kind: QueuedActionKind;
  // Arguments déjà finalisés de l'appel (RPC ou table) — rejoués tels quels.
  payload: Record<string, unknown>;
  // Libellé lisible affiché dans la liste des actions en attente.
  label: string;
  // Identifiant (client) de l'entité concernée : sert à afficher le badge
  // « en attente de synchronisation » sur la bonne ligne des listes.
  entity_id?: string | null;
  queued_at: string;
  attempts: number;
  status: "pending" | "failed";
  last_error?: string | null;
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function newClientRef() {
  return makeId();
}

// uuid v4 utilisable comme clé primaire côté base : les entités créées hors
// ligne reçoivent leur identifiant définitif dès la création locale, pour que
// les actions suivantes (achat, recette, fournée) puissent s'y référer.
export function newEntityId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Repli très rare (WebView anciens) : uuid v4 pseudo-aléatoire.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readRaw(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedAction[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Stockage indisponible : l'action reste en mémoire pour cette session.
  }
}

// Reprise des ventes rapides mises en file par l'ancienne version de l'app :
// elles sont converties une fois pour toutes, aucune n'est perdue.
function migrateLegacy(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  let legacy: any[] = [];
  try {
    const raw = window.localStorage.getItem(LEGACY_SALES_KEY);
    if (!raw) return [];
    legacy = JSON.parse(raw) ?? [];
  } catch {
    return [];
  }
  const converted: QueuedAction[] = legacy.map((l) => ({
    local_id: l.local_id ?? makeId(),
    client_ref: l.client_ref ?? makeId(),
    kind: "sale.quick",
    label: `Vente ${l.product_name ?? ""} × ${l.quantity_sold ?? ""}`.trim(),
    entity_id: l.product_id ?? null,
    queued_at: l.queued_at ?? new Date().toISOString(),
    attempts: 0,
    status: "pending",
    payload: {
      bakery_id: l.bakery_id,
      product_id: l.product_id,
      quantity_sold: l.quantity_sold,
      unit_price: l.unit_price,
      kept_quantity: l.kept_quantity ?? 0,
      thrown_quantity: l.thrown_quantity ?? 0,
    },
  }));
  try {
    window.localStorage.removeItem(LEGACY_SALES_KEY);
  } catch {}
  return converted;
}

let migrated = false;
function readQueue(): QueuedAction[] {
  const current = readRaw();
  if (!migrated) {
    migrated = true;
    const legacy = migrateLegacy();
    if (legacy.length) {
      const merged = [...current, ...legacy].sort((a, b) => a.queued_at.localeCompare(b.queued_at));
      write(merged);
      return merged;
    }
  }
  return current;
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}

export function getQueue(): QueuedAction[] {
  return readQueue();
}

export function enqueueAction(input: {
  kind: QueuedActionKind;
  payload: Record<string, unknown>;
  label: string;
  client_ref?: string;
  entity_id?: string | null;
}): QueuedAction {
  const entry: QueuedAction = {
    local_id: makeId(),
    client_ref: input.client_ref ?? makeId(),
    kind: input.kind,
    payload: input.payload,
    label: input.label,
    entity_id: input.entity_id ?? null,
    queued_at: new Date().toISOString(),
    attempts: 0,
    status: "pending",
    last_error: null,
  };
  const queue = readQueue();
  queue.push(entry);
  write(queue);
  notify();
  return entry;
}

export function removeAction(localId: string) {
  write(readQueue().filter((q) => q.local_id !== localId));
  notify();
}

export function retryAction(localId: string) {
  write(
    readQueue().map((q) =>
      q.local_id === localId ? { ...q, status: "pending", last_error: null } : q
    )
  );
  notify();
}

function markFailed(localId: string, message: string) {
  write(
    readQueue().map((q) =>
      q.local_id === localId
        ? { ...q, status: "failed", last_error: message, attempts: q.attempts + 1 }
        : q
    )
  );
  notify();
}

function markAttempt(localId: string) {
  write(readQueue().map((q) => (q.local_id === localId ? { ...q, attempts: q.attempts + 1 } : q)));
}

// Une erreur réseau (ou un délai dépassé) n'est jamais définitive : l'action
// doit rester en attente. Tout le reste vient du serveur et est définitif.
export function isNetworkError(e: unknown): boolean {
  const msg = (e as any)?.message ? String((e as any).message) : String(e ?? "");
  return (
    /network|timeout|fetch|failed to fetch|load failed|networkerror|offline|aborted/i.test(msg) ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  );
}

let syncing = false;

// Rejeu strictement chronologique et séquentiel : une fournée qui consomme du
// stock doit passer après le réapprovisionnement fait avant elle hors ligne.
export async function syncQueue(
  execute: (action: QueuedAction) => Promise<void>
): Promise<{ synced: number; failed: number; remaining: number }> {
  if (syncing) return { synced: 0, failed: 0, remaining: readQueue().length };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const ordered = readQueue()
      .filter((q) => q.status === "pending")
      .sort((a, b) => a.queued_at.localeCompare(b.queued_at));

    for (const action of ordered) {
      markAttempt(action.local_id);
      try {
        await execute(action);
        removeAction(action.local_id);
        synced++;
      } catch (e) {
        if (isNetworkError(e)) {
          // Toujours hors ligne : on s'arrête pour préserver l'ordre.
          break;
        }
        markFailed(action.local_id, (e as any)?.message ?? "Erreur inconnue");
        failed++;
      }
    }
  } finally {
    syncing = false;
  }
  return { synced, failed, remaining: readQueue().length };
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  useEffect(() => {
    const listener = () => setQueue(readQueue());
    listener();
    listeners.add(listener);
    // Autre onglet / autre instance de l'app.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return queue;
}

export function usePendingCount() {
  const queue = useOfflineQueue();
  return {
    pending: queue.filter((q) => q.status === "pending").length,
    failed: queue.filter((q) => q.status === "failed").length,
  };
}

// Vrai si cette entité (matière, produit, fournée…) a au moins une action en
// attente ou en échec : sert à afficher le badge de synchronisation.
export function usePendingEntityIds() {
  const queue = useOfflineQueue();
  return new Set(queue.map((q) => q.entity_id).filter(Boolean) as string[]);
}
