import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package2, Croissant, Flame, ShoppingBag,
  LineChart, History, LogOut, Wheat, Layers, User, Users, Lock,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBakery, useCurrentMember, useSubscription } from "@/lib/queries";

// ─────────────────────────────────────────────────────────────────────────────
// Lien support WhatsApp — externalisé en variable d'environnement (correction M1).
// Définir VITE_SUPPORT_WA dans .env :
// VITE_SUPPORT_WA=https://wa.me/22360673302?text=Bonjour%2C%20je%20souhaite%20obtenir%20un%20code%20d%27inscription
// ─────────────────────────────────────────────────────────────────────────────
const SUPPORT_WA =
  import.meta.env.VITE_SUPPORT_WA ??
  "https://wa.me/22360673302?text=Bonjour%2C%20je%20souhaite%20obtenir%20un%20code%20d%27inscription%20pour%20Ma%20Boulangerie";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // ── Vérification 1 : utilisateur authentifié ──────────────────────────
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

// ─────────────────────────────────────────────────────────────────────────────
// Route enfant /staff — garde owner vérifiée en base (correction C4).
// Ce fichier exporte aussi createStaffRoute pour que src/routes/_authenticated/staff.tsx
// puisse l'importer et s'en servir comme beforeLoad.
// ─────────────────────────────────────────────────────────────────────────────
export async function requireOwner() {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw redirect({ to: "/auth" });

  // Vérification du rôle directement en base — pas de dépendance à l'état React.
  const { data: member, error } = await supabase
    .from("bakery_members")
    .select("role")
    .eq("user_id", authData.user.id)
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

// ─────────────────────────────────────────────────────────────────────────────
// Écran : aucune boulangerie rattachée
// ─────────────────────────────────────────────────────────────────────────────
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
            href={SUPPORT_WA}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Obtenir un code d'inscription
          </a>
          <button
            onClick={onSignOut}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground hover:bg-secondary transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Écran : boulangerie bloquée ou abonnement expiré
// ─────────────────────────────────────────────────────────────────────────────
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
            ? "L'accès à cette boulangerie a été suspendu par l'administrateur de la plateforme. Contactez le support."
            : "L'abonnement de cette boulangerie a expiré. Contactez votre gérant ou le support pour le renouveler."}
        </p>
        <div className="mt-8">
          <button
            onClick={onSignOut}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground hover:bg-secondary transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout principal
// ─────────────────────────────────────────────────────────────────────────────
function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const qc = useQueryClient();
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
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  // ── 1. Chargement ────────────────────────────────────────────────────────
  // Attendre que le membership ET l'abonnement soient chargés avant de décider.
  const isLoadingAccess =
    memberLoading ||
    (currentMember !== null && currentMember !== undefined && subLoading);

  if (isLoadingAccess) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Wheat className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
        </div>
      </div>
    );
  }

  // ── 2. Aucune boulangerie ─────────────────────────────────────────────────
  // Un compte sans boulangerie n'a pas accès à l'app.
  // Cela couvre : nouveaux comptes avant activation, boulangeries supprimées.
  if (currentMember === null) {
    return <NoBakeryScreen onSignOut={signOut} />;
  }

  // ── 3. Boulangerie bloquée ou abonnement expiré ───────────────────────────
  // L'admin peut bloquer ou expirer l'abonnement depuis Bakery Boss Control.
  // Tous les membres (gérant ET employés) perdent l'accès.
  if (subscription?.status === "blocked" || subscription?.status === "expired") {
    return (
      <SuspendedScreen
        status={subscription.status as "blocked" | "expired"}
        onSignOut={signOut}
      />
    );
  }

  // ── 4. Accès normal ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
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
                  className={`rounded-full px-3 py-2 text-xs transition-colors ${
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
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
              title="Profil"
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Profil</span>
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
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
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] ${
                  active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 animate-fade-up">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        MonStock · Gestion pour boulangeries artisanales
      </footer>
    </div>
  );
}
