import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 60 s : sert le cache instantanément, refetch en arrière-plan seulement si besoin.
        staleTime: 60_000,
        // 48 h : données en mémoire longtemps pour garantir le hors ligne sur 2 jours.
        gcTime: 48 * 60 * 60_000,
        refetchOnWindowFocus: false,
        // false globalement : chaque useQuery qui a besoin de rafraîchir peut surcharger.
        refetchOnMount: false,
        networkMode: "offlineFirst",
        retry: 1,
        // Évite les re-renders inutiles : React Query compare profondément les données.
        structuralSharing: true,
      },
      mutations: { networkMode: "offlineFirst" },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // 120 s : navigation instantanée vers une page préchargée même après une hésitation.
    defaultPreloadStaleTime: 120_000,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
  });

  return router;
};
