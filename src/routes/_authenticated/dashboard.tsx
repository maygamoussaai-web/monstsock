import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useProducts, useMovements, formatQty } from "@/lib/inventory";
import { Package, TrendingDown, TrendingUp, AlertTriangle, Boxes, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const products = useProducts();
  const movements = useMovements();

  const stats = useMemo(() => {
    const list = products.data ?? [];
    const mvs = movements.data ?? [];
    const now = Date.now();
    const dayAgo = now - 24 * 3600 * 1000;
    const inToday = mvs.filter((m) => m.type === "in" && new Date(m.created_at).getTime() > dayAgo).length;
    const outToday = mvs.filter((m) => m.type === "out" && new Date(m.created_at).getTime() > dayAgo).length;
    const low = list.filter((p) => p.quantity <= p.low_stock_threshold);
    return { total: list.length, inToday, outToday, low };
  }, [products.data, movements.data]);

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Aperçu</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Tableau de bord</h1>
          <p className="mt-2 text-muted-foreground">Un regard sur l'état du fournil.</p>
        </div>
        <Link to="/products" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:opacity-95">
          Gérer le stock <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Boxes} label="Produits" value={stats.total.toString()} />
        <StatCard icon={TrendingUp} label="Entrées · 24h" value={stats.inToday.toString()} />
        <StatCard icon={TrendingDown} label="Sorties · 24h" value={stats.outToday.toString()} />
        <StatCard icon={AlertTriangle} label="Alertes stock" value={stats.low.length.toString()} tone={stats.low.length > 0 ? "warn" : "default"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card-elegant grain p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Alertes de stock faible</h2>
            <span className="text-xs text-muted-foreground">Seuil personnalisable par produit</span>
          </div>
          <div className="mt-5 space-y-2">
            {stats.low.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Tout va bien — aucun produit sous le seuil.
              </p>
            )}
            {stats.low.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg text-accent">{formatQty(p.quantity, p.unit)}</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">seuil {formatQty(p.low_stock_threshold, p.unit)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card-elegant grain p-6">
          <h2 className="font-display text-xl">Derniers mouvements</h2>
          <div className="mt-5 space-y-3">
            {(movements.data ?? []).slice(0, 6).map((m) => {
              const p = (products.data ?? []).find((x) => x.id === m.product_id);
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className={`grid h-8 w-8 place-items-center rounded-full ${m.type === "in" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"}`}>
                    {m.type === "in" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{p?.name ?? "Produit"}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString("fr-FR")}</p>
                  </div>
                  <p className="text-sm font-medium">{m.type === "in" ? "+" : "−"}{formatQty(m.quantity, p?.unit ?? "")}</p>
                </div>
              );
            })}
            {(movements.data ?? []).length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Aucun mouvement pour le moment.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = "default" }: { icon: any; label: string; value: string; tone?: "default" | "warn" }) {
  return (
    <div className="card-elegant card-elegant-hover grain p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className={`grid h-8 w-8 place-items-center rounded-full ${tone === "warn" ? "bg-accent/15 text-accent" : "bg-secondary text-secondary-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-4xl text-foreground">{value}</p>
    </div>
  );
}
