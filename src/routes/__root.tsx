import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  persistQueryClientSave,
} from "@tanstack/query-persist-client-core";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { registerServiceWorker } from "@/lib/pwa-register";
import {
  createIDBPersister,
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE,
  shouldPersistQuery,
} from "@/lib/query-persist";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-up">
        <p className="font-display text-8xl text-accent">404</p>
        <h2 className="mt-4 text-xl text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl">Un incident est survenu</h1>
        <p className="mt-2 text-sm text-muted-foreground">Réessayez ou revenez à l'accueil.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground"
          >Réessayer</button>
          <a href="/" className="rounded-full border px-5 py-2 text-sm">Accueil</a>
        </div>
      </div>
    </div>
  );
}

const TITLE = "MonStock — Gestion pour boulangeries artisanales";
const DESC = "MonStock, l'outil de gestion d'inventaire, de fournées et de ventes conçu pour les boulangeries artisanales et PME.";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" },
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "theme-color", content: "#c98a3d" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "MonStock" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [persister] = useState(() => createIDBPersister());
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let saveInterval: ReturnType<typeof setInterval> | undefined;

    const dehydrateOptions = { shouldDehydrateQuery: shouldPersistQuery };

    const forceSave = () => {
      persistQueryClientSave({
        queryClient,
        persister,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions,
      }).catch(() => {});
    };

    persistQueryClientRestore({
      queryClient,
      persister,
      maxAge: QUERY_CACHE_MAX_AGE,
      buster: QUERY_CACHE_BUSTER,
    })
      .catch(() => {
        // Pas de cache à restaurer (première visite, stockage indisponible...) :
        // l'app démarre simplement sans données locales, comme avant.
      })
      .finally(() => {
        if (cancelled) return;
        setIsRestoring(false);

        unsubscribe = persistQueryClientSubscribe({
          queryClient,
          persister,
          maxAge: QUERY_CACHE_MAX_AGE,
          buster: QUERY_CACHE_BUSTER,
          dehydrateOptions,
        });

        // Sauvegarde forcée dès que l'app passe en arrière-plan ou se ferme —
        // sans attendre le prochain cycle normal de sauvegarde.
        const flushOnHide = () => {
          if (document.visibilityState === "hidden") forceSave();
        };
        document.addEventListener("visibilitychange", flushOnHide);
        window.addEventListener("pagehide", flushOnHide);

        // Filet de sécurité supplémentaire : une sauvegarde complète toutes les
        // 20s pendant que l'app est utilisée. "visibilitychange" est fiable la
        // plupart du temps, mais un téléphone Android peut aussi tuer l'app
        // brutalement (batterie faible, gestion agressive de la RAM) sans
        // déclencher cet évènement à temps — cette sauvegarde périodique
        // garantit qu'on ne perd jamais plus de ~20s d'activité dans le pire cas.
        saveInterval = setInterval(forceSave, 20_000);

        const prevUnsubscribe = unsubscribe;
        unsubscribe = () => {
          prevUnsubscribe?.();
          document.removeEventListener("visibilitychange", flushOnHide);
          window.removeEventListener("pagehide", flushOnHide);
          if (saveInterval) clearInterval(saveInterval);
        };
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [queryClient, persister]);

  useEffect(() => {
    registerServiceWorker();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  if (isRestoring) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}