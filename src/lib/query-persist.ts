import { get, set, del, createStore } from "idb-keyval";
import type { UseStore } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/query-persist-client-core";

// ─────────────────────────────────────────────────────────────────────────────
// Persistance du cache de lecture (TanStack Query) dans IndexedDB.
//
// Branché via <PersistQueryClientProvider> dans __root.tsx (pas un appel
// manuel dans un useEffect) : ce composant expose un état interne
// "isRestoring" que useQuery respecte nativement — AUCUNE requête ne part tant
// que la restauration depuis IndexedDB n'est pas terminée. C'était la cause du
// bug "seuls nom/email s'affichent hors ligne" : avec l'appel manuel, les
// pages montées avant la fin de la restauration (asynchrone) déclenchaient
// leur propre chargement réseau, qui échouait instantanément hors ligne et
// marquait la donnée "en erreur" avant même que la sauvegarde locale n'ait pu
// arriver — une course perdue à chaque fois.
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

// Efface le cache persistant : appelé à la déconnexion pour ne pas laisser les
// données d'une boulangerie visibles au compte suivant sur le même appareil.
export async function clearPersistedQueryCache() {
  try {
    await del(IDB_KEY, getStore());
  } catch {
    // rien à faire
  }
}