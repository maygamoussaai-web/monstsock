import { createFileRoute, Link } from "@tanstack/react-router";
import { useBakery, useRawMaterials, useProducts, useBatches, useSalesSessions, usePurchases, useLedger } from "@/lib/queries";
import { formatMoney, formatQty, formatDateTime, UNIT_LABEL } from "@/lib/format";
import { AlertTriangle, Package2, Croissant, Flame, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data: bakery } = useBakery();
  const { data: materials = [] } = useRawMaterials();
  const { data: products = [] } = useProducts();
  const { data: batches = [] } = useBatches(5);
  const { data: sessions = [] } = useSalesSessions(5);
  const { data: purchases = [] } = usePurchases(50);
  const { data: ledger = [] } = useLedger(300);

  const kpis = useMemo(() => {
    const stockValueMat = materials.reduce((s, m) => s + m.stock * (m.avg_cost || 0), 0);
    const stockValueProd = products.reduce((s, p) => s + p.stock * (p.material_cost || 0), 0);
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
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-secondary overflow-hidden shrink-0">
          {(bakery as any)?.logo_url ? (
            <img src={(bakery as any).logo_url} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-xl text-muted-foreground">
              {(bakery?.name ?? "M").slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Tableau de bord</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl truncate">{bakery?.name ?? "Ma boulangerie"}</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi icon={Wallet} label="Valeur du stock" value={formatMoney(kpis.stockValueMat + kpis.stockValueProd)} sub={`${formatMoney(kpis.stockValueMat)} matières · ${formatMoney(kpis.stockValueProd)} produits`} />
        <Kpi icon={Package2} label="Achats (7 j)" value={formatMoney(kpis.purchases7)} />
        <Kpi icon={ShoppingBag} label="CA (30 j)" value={formatMoney(kpis.revenue30)} />
        <Kpi icon={TrendingUp} label="Bénéfice brut (30 j)" value={formatMoney(kpis.grossProfit30)} sub={`Coût matières ${formatMoney(kpis.matCost30)} · Pertes ${formatMoney(kpis.loss30)}`} />
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card-elegant p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Alertes de stock faible</h2>
            <span className="text-xs text-muted-foreground">{lowStock.length} élément(s)</span>
          </div>
          <div className="mt-4 divide-y divide-border">
            {lowStock.length === 0 && <p className="py-6 text-sm text-muted-foreground">Aucune alerte — vos stocks sont au-dessus des seuils.</p>}
            {lowStock.map((x) => (
              <div key={x.id + x.kind} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{x.name}</p>
                    <p className="text-xs text-muted-foreground">{x.kind} · seuil {formatQty(x.threshold, x.unit)}</p>
                  </div>
                </div>
                <p className="text-sm text-destructive whitespace-nowrap">{formatQty(x.stock, x.unit)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elegant p-6">
          <h2 className="font-display text-xl">Raccourcis</h2>
          <div className="mt-4 grid gap-2">
            <ShortcutLink to="/raw-materials" icon={Package2} label="Ajouter une matière" />
            <ShortcutLink to="/products" icon={Croissant} label="Créer un produit" />
            <ShortcutLink to="/batches" icon={Flame} label="Nouvelle fournée" />
            <ShortcutLink to="/sales" icon={ShoppingBag} label="Ouvrir une session de vente" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card-elegant p-6">
          <h2 className="font-display text-xl">Dernières fournées</h2>
          <div className="mt-4 space-y-3">
            {batches.length === 0 && <p className="text-sm text-muted-foreground">Aucune fournée enregistrée.</p>}
            {batches.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(b.created_at)} · {b.batch_outputs.length} produit(s)</p>
                </div>
                <p className="text-xs text-muted-foreground">{formatMoney(b.total_material_cost)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card-elegant p-6">
          <h2 className="font-display text-xl">Dernières ventes</h2>
          <div className="mt-4 space-y-3">
            {sessions.length === 0 && <p className="text-sm text-muted-foreground">Aucune session de vente.</p>}
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(s.created_at)} · {s.status === "closed" ? "clôturée" : "ouverte"}</p>
                </div>
                <p className="text-xs text-muted-foreground">{formatMoney(s.total_revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="card-elegant p-4 sm:p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] uppercase tracking-[0.2em]">{label}</p>
      </div>
      <p className="mt-2 font-display text-xl sm:text-2xl">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{sub}</p>}
    </div>
  );
}

function ShortcutLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm hover:bg-secondary transition-colors">
      <Icon className="h-4 w-4 text-accent" /> {label}
    </Link>
  );
}
