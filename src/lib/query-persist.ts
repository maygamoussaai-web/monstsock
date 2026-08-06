import { get, set, del, createStore } from "idb-keyval";
import type { UseStore } from "idb-keyval";
import {
  persistQueryClient,
  type PersistedClient,
  type Persister,
} from "@tanstack/query-persist-client-core";
import type { QueryClient } from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────────────────────
// Persistance du cache de lecture (TanStack Query) dans IndexedDB.
//
// Objectif : à l'ouverture de l'app SANS réseau, les listes (matières, produits,
// fournées, ventes…) s'affichent immédiatement avec les dernières données
// connues, au lieu d'un écran vide. IndexedDB est utilisé plutôt que
// localStorage car il est asynchrone (pas de blocage de l'interface) et
// nettement plus large en capacité.
// ─────────────────────────────────────────────────────────────────────────────

const IDB_KEY = "monstock:query-cache";
const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 jours

let store: UseStore | null = null;
function getStore(): UseStore {
  if (!store) store = createStore("monstock", "query-cache");
  return store;
}

function createIDBPersister(): Persister {
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

let started = false;

// Démarre la persistance (restauration + sauvegarde continue). Uniquement côté
// navigateur, et une seule fois par session.
export function startQueryPersistence(queryClient: QueryClient) {
  if (typeof window === "undefined" || started) return;
  started = true;
  try {
    persistQueryClient({
      // Deux copies de query-core peuvent coexister dans node_modules : les
      // types diffèrent alors qu'il s'agit du même objet à l'exécution.
      queryClient: queryClient as never,
      persister: createIDBPersister(),
      maxAge: MAX_AGE,
      buster: "v1",
    });
  } catch {
    // IndexedDB indisponible (navigation privée ancienne, quota) : l'app
    // fonctionne normalement, simplement sans cache entre deux sessions.
  }
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
