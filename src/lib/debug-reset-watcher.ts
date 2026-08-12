import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";

// Outil de diagnostic TEMPORAIRE : note chaque fois qu'une donnée déjà
// chargée (liste non vide) redevient vide ou disparaît du cache, avec l'heure
// exacte et si l'app était en ligne/hors ligne à ce moment — pour remplacer
// "ça arrive parfois" par une preuve exacte. À retirer une fois le bug trouvé.
const LOG_KEY = "monstock:debug-resets";
const MAX_ENTRIES = 30;

type ResetEntry = {
  at: string;
  queryKey: string;
  from: number;
  online: boolean;
};

export function getDebugResets(): ResetEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearDebugResets() {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {}
}

function record(entry: ResetEntry) {
  try {
    const list = getDebugResets();
    list.unshift(entry);
    localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {}
}

function lengthOf(data: unknown): number | null {
  if (Array.isArray(data)) return data.length;
  return null; // on ne surveille que les listes, pas les objets uniques
}

export function useDebugResetWatcher(queryClient: QueryClient) {
  useEffect(() => {
    const previous = new Map<string, number>();

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" && event.type !== "added") return;
      const query = event.query;
      const key = JSON.stringify(query.queryKey);
      const len = lengthOf(query.state.data);
      if (len === null) return;

      const prev = previous.get(key);
      if (prev !== undefined && prev > 0 && len === 0) {
        record({
          at: new Date().toISOString(),
          queryKey: key,
          from: prev,
          online: typeof navigator !== "undefined" ? navigator.onLine : true,
        });
      }
      previous.set(key, len);
    });

    return unsubscribe;
  }, [queryClient]);
}