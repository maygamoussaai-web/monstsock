import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // staleTime : sert le cache instantanément et ne refait un fetch en
        // arrière-plan que si la donnée a plus de 30s ou a été invalidée.
        staleTime: 30_000,
        // gcTime : doit largement dépasser la durée entre deux ouvertures de
        // l'app. Gouverne quand une donnée non consultée est évincée de la
        // MÉMOIRE — pas seulement du cache persistant. À 5 minutes (valeur par
        // défaut de react-query), toute page non visitée depuis plus de 5 min
        // était silencieusement effacée en mémoire, et cette purge se
        // retrouvait ensuite écrite dans le cache hors ligne à la sauvegarde
        // suivante : c'était la cause de "il faut se reconnecter à chaque
        // fois". Remonté à 24h pour que le hors ligne reste fiable sur une
        // pleine journée sans avoir besoin de repasser en ligne.
        gcTime: 48 * 60 * 60_000, // 24h
        refetchOnWindowFocus: false,
        networkMode: "offlineFirst",
        retry: 1,
      },
      mutations: { networkMode: "offlineFirst" },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 30_000,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
  });

  return router;
};