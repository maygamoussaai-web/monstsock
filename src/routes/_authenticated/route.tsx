import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package2, Croissant, Flame, ShoppingBag,
  LineChart, History, LogOut, Wheat, Layers, User, Users, Lock, MessageCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBakery, useCurrentMember, useSubscription } from "@/lib/queries";

// ─────────────────────────────────────────────────────────────────────────────
// Lien support WhatsApp — utilisé pour obtenir un code d'inscription (NoBakeryScreen)
// et pour contacter l'admin MAYGA depuis un compte bloqué/expiré (SuspendedScreen).
// Même numéro que dans auth.tsx et profile.tsx.
// ─────────────────────────────────────────────────────────────────────────────
const SUPPORT_WA_URL =
  "https://wa.me/22360673302?text=Bonjour%2C%20je%20souhaite%20obtenir%20un%20code%20d%27inscription%20pour%20MonStock";
const ADMIN_WA_URL =
  "https://wa.me/22360673302?text=Bonjour%2C%20mon%20acc%C3%A8s%20%C3%A0%20MonStock%20est%20bloqu%C3%A9%2Fexpir%C3%A9%2C%20pouvez-vous%20m%27aider%20%3F";

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
// BaguetteLoader — icône de l'écran de chargement. Une baguette (couleur croûte
// orange foncé) tourne en orbite circulaire autour d'un halo chaud, avec une
// traînée de particules de farine derrière elle. Remplace l'ancien Wheat statique.
// Couleurs définies en local, indépendantes des tokens du thème (oklch).
// ─────────────────────────────────────────────────────────────────────────────
function BaguetteLoader() {
  return (
    <div className="relative" aria-hidden="true">
      <style>{`
        .ms-loader {
          --crust: #a8541f;
          --crust-dark: #7d3c14;
          --accent: #c97c3d;
          --glow: #e8b06b;
        }
        @keyframes ms-orbit-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ms-glow-breathe {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%      { opacity: 0.6;  transform: scale(1.08); }
        }
        @keyframes ms-trail-fade {
          0%, 100% { opacity: var(--base-op); }
        }
        .ms-orbit { animation: ms-orbit-spin 1.6s linear infinite; transform-origin: 50px 50px; }
        .ms-loader-glow { animation: ms-glow-breathe 1.6s ease-in-out infinite; transform-origin: 50px 50px; }
      `}</style>
      <svg className="ms-loader" width="56" height="56" viewBox="0 0 100 100" fill="none">
        <circle className="ms-loader-glow" cx="50" cy="50" r="34" fill="var(--glow)" opacity={0.4} />

        <g className="ms-orbit">
          {/* Traînée de farine derrière la baguette */}
          <circle cx="50" cy="20" r="2.4" fill="var(--accent)" style={{ ["--base-op" as any]: 0.15, opacity: 0.15 }} transform="rotate(24 50 50)" />
          <circle cx="50" cy="20" r="2.8" fill="var(--accent)" style={{ ["--base-op" as any]: 0.3, opacity: 0.3 }} transform="rotate(14 50 50)" />
          <circle cx="50" cy="20" r="3.2" fill="var(--accent)" style={{ ["--base-op" as any]: 0.5, opacity: 0.5 }} transform="rotate(7 50 50)" />

          {/* Petite baguette, tangente à l'orbite */}
          <g transform="translate(50 16) rotate(90)">
            <rect x="-11" y="-3.4" width="22" height="6.8" rx="3.4" fill="var(--crust)" />
            <line x1="-6" y1="-2" x2="-4" y2="2" stroke="var(--crust-dark)" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="-1.5" y1="-2.2" x2="0.5" y2="2.2" stroke="var(--crust-dark)" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="3" y1="-2" x2="5" y2="2" stroke="var(--crust-dark)" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Écran : aucune boulangerie rattachée
//
// Note : ce cas ne couvre plus la suppression de boulangerie ni le retrait d'un
// employé — dans ces deux cas, le compte Auth Supabase de la personne est
// désormais supprimé (owner_delete_bakery / admin_delete_bakery / remove_bakery_member),
// donc elle échoue dès l'écran de connexion et n'atteint jamais ce layout.
// Cet écran ne sert plus que pour un compte authentifié qui n'a jamais été
// rattaché à une boulangerie (cas limite / sécurité supplémentaire).
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
            href={SUPPORT_WA_URL}
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
//
// - "blocked" : accès suspendu par l'admin MAYGA. Les données restent conservées
//   en base, seul l'accès est coupé. Écran inchangé sur le fond, on ajoute juste
//   le lien de contact qui manquait.
// - "expired" : couvre à la fois un abonnement que l'admin a marqué "expired"
//   ET une expiration naturelle (date de fin dépassée) détectée côté client
//   dans AuthedLayout, sans action de l'admin nécessaire.
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
            ? "L'accès à cette boulangerie a été suspendu par l'administrateur de la plateforme. Vos données restent conservées. Contactez l'admin MAYGA pour rétablir l'accès."
            : "L'abonnement de cette boulangerie a expiré. Vos données restent conservées. Contactez l'admin MAYGA pour le renouveler."}
        </p>
        <div className="mt-8 space-y-3">
          <a
            href={ADMIN_WA_URL}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="h-4 w-4" />
            Contacter l'admin MAYGA
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
          <BaguetteLoader />
          <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
        </div>
      </div>
    );
  }

  // ── 2. Aucune boulangerie ─────────────────────────────────────────────────
  if (currentMember === null) {
    return <NoBakeryScreen onSignOut={signOut} />;
  }

  // ── 3. Boulangerie bloquée ou abonnement expiré ───────────────────────────
  // "expired" couvre : status déjà marqué "expired" par l'admin, OU date de fin
  // (subscription_end / trial_end) dépassée sans qu'aucune action de l'admin
  // n'ait été nécessaire — l'expiration naturelle doit bloquer l'accès elle aussi.
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
