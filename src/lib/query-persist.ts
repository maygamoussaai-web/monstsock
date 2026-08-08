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

// Exclut l'historique brut (stock_ledger) du cache persistant : c'est de loin
// le plus gros volume de données (jusqu'à 800 lignes rechargées à chaque
// visite de l'historique/finances), et le moins critique à avoir hors ligne
// (les stocks/produits/recettes/fournées, eux, sont indispensables). Un cache
// plus léger se sérialise et s'écrit plus vite sur le disque à chaque
// sauvegarde — c'est ce qui ralentissait les actions et rendait les
// sauvegardes moins fiables (une sauvegarde plus longue a plus de chances de
// ne pas se terminer avant que le téléphone ne tue l'app en arrière-plan).
export function shouldPersistQuery(query: Query): boolean {
  return query.queryKey[0] !== "ledger";
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