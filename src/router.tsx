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
        // Hors ligne : servir le cache immédiatement au lieu de mettre la
        // requête en pause sans rien afficher.
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
    // Deuxième cause du lag : par défaut TanStack Router ne précharge RIEN — le code
    // (chunk JS) de la page de destination n'est demandé qu'au moment du clic, ce qui
    // ajoute un aller-retour réseau visible avant même que la page ne commence à
    // s'afficher, surtout sur une connexion mobile lente. "intent" déclenche ce
    // téléchargement dès le survol (ou le premier contact tactile) d'un lien, donc le
    // code est déjà en cache la plupart du temps quand l'utilisateur clique réellement.
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
  });

  return router;
};
