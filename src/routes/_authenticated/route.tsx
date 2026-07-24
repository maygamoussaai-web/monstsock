import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package2, Croissant, Flame, ShoppingBag, LineChart, History, LogOut, Wheat, Layers, User, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBakery, useCurrentMember } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const nav = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/raw-materials", label: "Matières", icon: Package2 },
  { to: "/products", label: "Produits", icon: Croissant },
  { to: "/batch-templates", label: "Modèles", icon: Layers },
  { to: "/batches", label: "Fournées", icon: Flame },
  { to: "/sales", label: "Ventes", icon: ShoppingBag },
  { to: "/finance", label: "Finances", icon: LineChart },
  { to: "/history", label: "Historique", icon: History },
] as const;

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: bakery } = useBakery();
  const { data: currentMember } = useCurrentMember();
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
