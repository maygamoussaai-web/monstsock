import { get, set, del, createStore } from "idb-keyval";
import type { UseStore } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/query-persist-client-core";
import type { Query } from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────────────────────
// Persistance du cache de lecture (TanStack Query) dans IndexedDB.
//
// Branché via une restauration manuelle dans __root.tsx (persistQueryClientRestore
// / Subscribe / Save) : aucune requête ne part tant que la restauration depuis
// IndexedDB n'est pas terminée.
// ─────────────────────────────────────────────────────────────────────────────

export const QUERY_CACHE_BUSTER = "v1";
export const QUERY_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 jours

const IDB_KEY = "monstock:query-cache";

let store: UseStore | null = null;
function getStore(): UseStore {
  if (!store) store = createStore("monstock", "query-cache");
  return store;
}

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(IDB_KEY, client, getStore());
    },
    restoreClient: async () => {
      return await get<PersistedClient>(IDB_KEY, getStore());
    },
    removeClient: async () => {
      await del(IDB_KEY, getStore());
    },
  };
}

// Plus aucune exclusion : toutes les données (y compris l'historique des
// mouvements de stock — ventes, achats, fournées, pertes — qui alimente le
// journal des ventes, l'historique et les chiffres de chiffre d'affaires/
// bénéfices) sont désormais conservées hors ligne. Les tailles de requêtes ont
// déjà été limitées ailleurs dans le projet (300 à 800 lignes selon la page),
// donc l'impact sur la vitesse de sauvegarde reste modéré.
export function shouldPersistQuery(): boolean {
  return true;
}
// Efface le cache persistant : appelé à la déconnexion pour ne pas laisser les
// données d'une boulangerie visibles au compte suivant sur le même appareil.
export async function clearPersistedQueryCache() {
  try {
    await del(IDB_KEY, getStore());
  } catch {
    // rien à faire
  }
}