import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package2, Croissant, Flame, ShoppingBag,
  LineChart, History, LogOut, Wheat, Layers, User, Users, Lock, MessageCircle, CloudUpload,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBakery, useCurrentMember, useSubscription } from "@/lib/queries";
import { BaguetteLoader } from "@/components/Loader";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useOfflineQueueSync } from "@/lib/queries";
import { usePendingCount } from "@/lib/offline-queue";
import { clearPersistedQueryCache } from "@/lib/query-persist";

const SUPPORT_WA_URL =
  "https://wa.me/22360673302?text=Bonjour%2C%20je%20souhaite%20obtenir%20un%20code%20d%27inscription%20pour%20MonStock";
const ADMIN_WA_URL =
  "https://wa.me/22360673302?text=Bonjour%2C%20mon%20acc%C3%A8s%20%C3%A0%20MonStock%20est%20bloqu%C3%A9%2Fexpir%C3%A9%2C%20pouvez-vous%20m%27aider%20%3F";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: AuthedLayout,
});

export async function requireOwner() {
  const { data: authData } = await supabase.auth.getSession();
  const user = authData.session?.user;
  if (!user) throw redirect({ to: "/auth" });

  const { data: member, error } = await supabase
    .from("bakery_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !member || member.role !== "owner") {
    throw redirect({ to: "/dashboard" });
  }
}

const nav = [
  { to: "/dashboard",       label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/raw-materials",   label: "Matières",         icon: Package2 },
  { to: "/products",        label: "Produits",         icon: Croissant },
  { to: "/batch-templates", label: "Modèles",          icon: Layers },
  { to: "/batches",         label: "Fournées",         icon: Flame },
  { to: "/sales",           label: "Ventes",           icon: ShoppingBag },
  { to: "/finance",         label: "Finances",         icon: LineChart },
  { to: "/history",         label: "Historique",       icon: History },
] as const;

function AnimatedLoadingBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes ms-blob-a {
          0%, 100% { transform: translate(-6%, -4%) scale(1); }
          50%      { transform: translate(4%, 6%) scale(1.12); }
        }
        @keyframes ms-blob-b {
          0%, 100% { transform: translate(5%, 3%) scale(1); }
          50%      { transform: translate(-6%, -5%) scale(1.08); }
        }
        @keyframes ms-blob-c {
          0%, 100% { transform: translate(0%, 6%) scale(1); }
          50%      { transform: translate(3%, -6%) scale(1.15); }
        }
        .ms-blob-a { animation: ms-blob-a 14s ease-in-out infinite; }
        .ms-blob-b { animation: ms-blob-b 18s ease-in-out infinite; }
        .ms-blob-c { animation: ms-blob-c 16s ease-in-out infinite; }
      `}</style>
      <div
        className="ms-blob-a absolute -top-1/4 -left-1/4 h-[60vmax] w-[60vmax] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, #e8b06b55 0%, transparent 70%)" }}
      />
      <div
        className="ms-blob-b absolute -bottom-1/4 -right-1/4 h-[55vmax] w-[55vmax] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, #a8541f3d 0%, transparent 70%)" }}
      />
      <div
        className="ms-blob-c absolute top-1/3 right-1/4 h-[40vmax] w-[40vmax] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, #c97c3d33 0%, transparent 70%)" }}
      />
    </div>
  );
}

function NoBakeryScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-sm w-full text-center animate-fade-up">
        <div className="grid h-16 w-16 mx-auto place-items-center rounded-2xl bg-secondary">
          <Wheat className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mt-6 font-display text-2xl">Aucune boulangerie</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Votre compte n'est rattaché à aucune boulangerie.
          Pour accéder à l'application, rejoignez une boulangerie via le lien d'invitation de votre gérant,
          ou créez un nouveau compte gérant avec un code d'inscription.
        </p>
        <div className="mt-8 space-y-3">
          <a
            href={SUPPORT_WA_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-press btn-shimmer flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          >
            Obtenir un code d'inscription
          </a>
          <button
            onClick={onSignOut}
            className="btn-press w-full rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground hover:bg-secondary"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

function SuspendedScreen({
  status,
  onSignOut,
}: {
  status: "blocked" | "expired";
  onSignOut: () => void;
}) {
  const isBlocked = status === "blocked";
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-sm w-full text-center animate-fade-up">
        <div className="grid h-16 w-16 mx-auto place-items-center rounded-2xl bg-destructive/10">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="mt-6 font-display text-2xl text-destructive">
          {isBlocked ? "Accès bloqué" : "Abonnement expiré"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {isBlocked
            ? "L'accès à cette boulangerie a été suspendu par l'administrateur de la plateforme. Vos données restent conservées. Contactez l'admin MAYGA pour rétablir l'accès."
            : "L'abonnement de cette boulangerie a expiré. Vos données restent conservées. Contactez l'admin MAYGA pour le renouveler."}
        </p>
        <div className="mt-8 space-y-3">
          <a
            href={ADMIN_WA_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-press btn-shimmer flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            Contacter l'admin MAYGA
          </a>
          <button
            onClick={onSignOut}
            className="btn-press w-full rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground hover:bg-secondary"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const qc = useQueryClient();useOfflineQueueSync();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: bakery } = useBakery();
  const { data: currentMember, isLoading: memberLoading } = useCurrentMember();
  const { data: subscription, isLoading: subLoading } = useSubscription(
    currentMember?.bakery_id ?? undefined
  );

  const isOwner = currentMember?.role === "owner";
  const navItems = isOwner
    ? [...nav, { to: "/staff" as const, label: "Mon personnel", icon: Users }]
    : nav;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await clearPersistedQueryCache();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const isLoadingAccess =
    memberLoading ||
    (currentMember !== null && currentMember !== undefined && subLoading);

  if (isLoadingAccess) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background">
        <AnimatedLoadingBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <BaguetteLoader />
          <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
        </div>
      </div>
    );
  }

  if (currentMember === null) {
    return <NoBakeryScreen onSignOut={signOut} />;
  }

  const now = Date.now();
  const pastEnd = (iso: string | null | undefined) => !!iso && new Date(iso).getTime() < now;
  const isNaturallyExpired =
    (subscription?.status === "active" && pastEnd(subscription.subscription_end)) ||
    (subscription?.status === "trial" && pastEnd(subscription.trial_end));

  const accessStatus: "blocked" | "expired" | null =
    subscription?.status === "blocked"
      ? "blocked"
      : subscription?.status === "expired" || isNaturallyExpired
      ? "expired"
      : null;

  if (accessStatus) {
    return <SuspendedScreen status={accessStatus} onSignOut={signOut} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <OfflineBanner />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-3 sm:py-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
              <Wheat className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-lg leading-none text-foreground">MonStock</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground truncate max-w-[220px]">
                {bakery?.name ?? "Ma boulangerie"}
              </p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-3 py-2 text-xs transition-all duration-200 hover:-translate-y-0.5 ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {pendingTotal > 0 && (
              <Link
                to="/sync"
                title="Actions à synchroniser"
                className="btn-press relative inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-foreground hover:bg-secondary"
              >
                <CloudUpload className="h-3.5 w-3.5 icon-pop" />
                <span className="hidden sm:inline">À synchroniser</span>
                <span
                  className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-medium ${
                    failed > 0
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {pendingTotal}
                </span>
              </Link>
            )}
            <Link
              to="/profile"
              className="btn-press inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-foreground hover:bg-secondary"
              title="Profil"
            >
              <User className="h-3.5 w-3.5 icon-pop" />
              <span className="hidden sm:inline">Profil</span>
            </Link>
            <button
              onClick={signOut}
              className="btn-press inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-foreground hover:bg-secondary"
            >
              <LogOut className="h-3.5 w-3.5 icon-pop" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        <nav className="lg:hidden flex items-center gap-1.5 overflow-x-auto px-4 pb-3">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`btn-press inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] ${
                  active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main key={pathname} className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 animate-page-in">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        MonStock · Gestion pour boulangeries artisanales
      </footer>
    </div>
  );
}