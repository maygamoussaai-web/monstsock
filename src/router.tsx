import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // staleTime par défaut à 0 = React Query considère TOUTE donnée comme périmée
  // dès qu'elle est mise en cache, donc chaque retour sur une page déjà visitée
  // (Dashboard, Produits, etc.) redéclenchait un aller-retour réseau complet avant
  // de pouvoir afficher quoi que ce soit → c'était la cause principale du lag ressenti
  // entre les pages. Avec un staleTime de 30s, react-query sert d'abord les données
  // en cache (affichage instantané) et ne refait un fetch en arrière-plan que si elles
  // ont plus de 30s ou si une mutation a explicitement invalidé la query concernée.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
