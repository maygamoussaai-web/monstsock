import { createFileRoute, Link } from "@tanstack/react-router";
import { useBakery, useRawMaterials, useProducts, useBatches, usePurchases, useLedger } from "@/lib/queries";
import { formatMoney, formatQty, formatDateTime, UNIT_LABEL } from "@/lib/format";
import { AlertTriangle, Package2, Croissant, Flame, ShoppingBag, TrendingUp, Wallet, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { AnimatedNumber, stagger } from "@/components/motion";
import { EmptyState, SkeletonRows, Badge } from "@/components/Loader";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data: bakery } = useBakery();
  const { data: materials = [], isLoading: matLoading } = useRawMaterials();
  const { data: products = [] } = useProducts();
  const { data: batches = [] } = useBatches(5);
  const { data: purchases = [] } = usePurchases(50);
  const { data: ledger = [], isLoading: ledgerLoading } = useLedger(300);

  const kpis = useMemo(() => {
    const stockValueMat = materials.reduce((s, m) => s + m.stock * (m.avg_cost || 0), 0);
    const stockValueProd = products.reduce((s, p) => s + p.stock * (p.sale_price || 0), 0);
    const now = Date.now();
    const since7 = now - 7 * 86400_000;
    const since30 = now - 30 * 86400_000;
    const purchases7 = purchases.filter((p) => new Date(p.created_at).getTime() > since7).reduce((s, p) => s + p.total_price, 0);
    const revenue30 = ledger.filter((l) => l.kind === "sale" && new Date(l.created_at).getTime() > since30).reduce((s, l) => s + l.delta_value, 0);
    const matCost30 = ledger.filter((l) => l.kind === "batch_consume" && new Date(l.created_at).getTime() > since30).reduce((s, l) => s + Math.abs(l.delta_value), 0);
    const loss30 = ledger.filter((l) => l.kind === "loss" && new Date(l.created_at).getTime() > since30).reduce((s, l) => s + Math.abs(l.delta_value), 0);
    const grossProfit30 = revenue30 - matCost30 - loss30;
    return { stockValueMat, stockValueProd, purchases7, revenue30, matCost30, loss30, grossProfit30 };
  }, [materials, products, purchases, ledger]);

  const lowStock = [
    ...materials.filter((m) => m.stock <= m.low_stock_threshold).map((m) => ({
      id: m.id, name: m.name, stock: m.stock, threshold: m.low_stock_threshold, unit: UNIT_LABEL[m.unit], kind: "Matière",
    })),
    ...products.filter((p) => p.stock <= p.low_stock_threshold).map((p) => ({
      id: p.id, name: p.name, stock: p.stock, threshold: p.low_stock_threshold, unit: UNIT_LABEL[p.unit], kind: "Produit",
    })),
  ];

  return (
    <div className="space-y-8">
      {/* En-tête premium : dégradé chaud + formes décoratives en fond */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-[var(--gradient-warm)] px-5 py-7 sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.62 0.11 55 / 0.28), transparent 70%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.32 0.05 45 / 0.14), transparent 70%)" }}
        />
        <div className="relative flex items-start gap-4">
          <div className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-card shadow-[var(--shadow-soft)] overflow-hidden shrink-0 ring-1 ring-border/60">
            {(bakery as any)?.logo_url ? (
              <img src={(bakery as any).logo_url} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-xl text-accent">
                {(bakery?.name ?? "M").slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.28em] text-accent">Tableau de bord</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl md:text-4xl leading-tight break-words">{bakery?.name ?? "Ma boulangerie"}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {lowStock.length > 0
                ? `${lowStock.length} alerte${lowStock.length > 1 ? "s" : ""} de stock à surveiller aujourd'hui`
                : "Tout est sous contrôle aujourd'hui"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi index={0} icon={Wallet} label="Valeur du stock" value={kpis.stockValueMat + kpis.stockValueProd} sub={`${formatMoney(kpis.stockValueMat)} matières · ${formatMoney(kpis.stockValueProd)} produits`} />
        <Kpi index={1} icon={Package2} label="Achats (7 j)" value={kpis.purchases7} />
        <Kpi index={2} icon={ShoppingBag} label="CA (30 j)" value={kpis.revenue30} accent />
        <Kpi index={3} icon={TrendingUp} label="Bénéfice brut (30 j)" value={kpis.grossProfit30} sub={`Coût matières ${formatMoney(kpis.matCost30)} · Pertes ${formatMoney(kpis.loss30)}`} accent />
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card-elegant card-elegant-hover p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-medallion">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <h2 className="font-display text-xl">Alertes de stock faible</h2>
            </div>
            {lowStock.length > 0 && <Badge tone="warning">{lowStock.length} élément(s)</Badge>}
          </div>
          <div className="mt-4 divide-y divide-border">
            {matLoading && <div className="py-3"><SkeletonRows rows={3} /></div>}
            {!matLoading && lowStock.length === 0 && (
              <EmptyState icon={ShieldCheck} title="Aucune alerte" description="Tous vos stocks sont au-dessus de leurs seuils." />
            )}
            {lowStock.map((x, i) => (
              <div key={x.id + x.kind} className="animate-fade-up py-3 flex items-center justify-between gap-3" style={stagger(i)}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{x.name}</p>
                    <p className="text-xs text-muted-foreground">{x.kind} · seuil {formatQty(x.threshold, x.unit)}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-destructive whitespace-nowrap stat-figure">{formatQty(x.stock, x.unit)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center gap-3">
            <div className="icon-medallion">
              <ArrowUpRight className="h-4.5 w-4.5" />
            </div>
            <h2 className="font-display text-xl">Raccourcis</h2>
          </div>
          <div className="mt-4 grid gap-2">
            <ShortcutLink to="/raw-materials" icon={Package2} label="Ajouter une matière" />
            <ShortcutLink to="/products" icon={Croissant} label="Créer un produit" />
            <ShortcutLink to="/batches" icon={Flame} label="Nouvelle fournée" />
            <ShortcutLink to="/sales" icon={ShoppingBag} label="Ouvrir une session de vente" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card-elegant card-elegant-hover p-6">
          <div className="flex items-center gap-3">
            <div className="icon-medallion"><Flame className="h-4.5 w-4.5" /></div>
            <h2 className="font-display text-xl">Dernières fournées</h2>
          </div>
          <div className="mt-4 space-y-3">
            {batches.length === 0 && (
              <EmptyState icon={Flame} title="Aucune fournée" description="Vos productions apparaîtront ici dès la première fournée enregistrée." />
            )}
            {batches.map((b, i) => (
              <div key={b.id} className="animate-fade-up flex items-center justify-between text-sm" style={stagger(i)}>
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(b.created_at)} · {b.batch_outputs.length} produit(s)</p>
                </div>
                <p className="text-xs text-muted-foreground stat-figure">{formatMoney(b.total_material_cost)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card-elegant card-elegant-hover p-6">
          <div className="flex items-center gap-3">
            <div className="icon-medallion"><ShoppingBag className="h-4.5 w-4.5" /></div>
            <h2 className="font-display text-xl">Dernières ventes</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(() => {
              const sales = ledger.filter((l) => l.kind === "sale").slice(0, 6);
              if (ledgerLoading) return <SkeletonRows rows={3} />;
              if (sales.length === 0)
                return <EmptyState icon={ShoppingBag} title="Aucune vente" description="Ouvrez une session de vente pour voir vos ventes du jour ici." />;
              return sales.map((s, i) => (
                <div key={s.id} className="animate-fade-up flex items-center justify-between text-sm" style={stagger(i)}>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.products?.name ?? "Produit"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(s.created_at)} · {formatQty(Math.abs(s.delta_quantity), UNIT_LABEL[s.products?.unit ?? "unite"])}
                    </p>
                  </div>
                  <p className="text-xs font-medium text-accent whitespace-nowrap stat-figure">{formatMoney(s.delta_value)}</p>
                </div>
              ));
            })()}
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, index = 0, accent = false }: { icon: any; label: string; value: number; sub?: string; index?: number; accent?: boolean }) {
  return (
    <div className={`${accent ? "card-premium" : "card-elegant"} card-elegant-hover animate-fade-up p-4 sm:p-5`} style={stagger(index)}>
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent/12 text-accent shrink-0">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2.5 stat-figure text-2xl sm:text-3xl">
        <AnimatedNumber value={value} format={(v) => formatMoney(v)} />
      </p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{sub}</p>}
    </div>
  );
}

function ShortcutLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="btn-press group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm hover:bg-secondary">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent transition-transform duration-250 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]">
        <Icon className="h-4 w-4" />
      </div>
      {label}
    </Link>
  );
}