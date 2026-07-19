import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLedger, useRawMaterials, useProducts, usePurchases } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { LineChart, Wallet, ShoppingBag, TrendingDown, TrendingUp, Package2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance")({ component: FinancePage });

const RANGES = [
  { key: "7", label: "7 jours", days: 7 },
  { key: "30", label: "30 jours", days: 30 },
  { key: "90", label: "90 jours", days: 90 },
  { key: "all", label: "Tout", days: 3650 },
] as const;

function FinancePage() {
  const [range, setRange] = useState<typeof RANGES[number]["key"]>("30");
  const { data: ledger = [] } = useLedger(2000);
  const { data: materials = [] } = useRawMaterials();
  const { data: products = [] } = useProducts();
  const { data: purchases = [] } = usePurchases(500);

  const days = RANGES.find((r) => r.key === range)!.days;
  const since = Date.now() - days * 86400_000;

  const stats = useMemo(() => {
    const filt = ledger.filter((l) => new Date(l.created_at).getTime() > since);
    const purch = purchases.filter((p) => new Date(p.created_at).getTime() > since);
    const stockMat = materials.reduce((s, m) => s + m.stock * (m.avg_cost || 0), 0);
    const stockProd = products.reduce((s, p) => s + p.stock * (p.material_cost || 0), 0);
    const revenue = filt.filter((l) => l.kind === "sale").reduce((s, l) => s + l.delta_value, 0);
    const purchasesTotal = purch.reduce((s, p) => s + p.total_price, 0);
    const matCost = filt.filter((l) => l.kind === "batch_consume").reduce((s, l) => s + Math.abs(l.delta_value), 0);
    const losses = filt.filter((l) => l.kind === "loss").reduce((s, l) => s + Math.abs(l.delta_value), 0);
    const gross = revenue - matCost - losses;

    // Top products
    const productRev = new Map<string, { name: string; value: number; qty: number }>();
    filt.filter((l) => l.kind === "sale" && l.product_id).forEach((l) => {
      const key = l.product_id!;
      const cur = productRev.get(key) ?? { name: l.products?.name ?? "—", value: 0, qty: 0 };
      cur.value += l.delta_value;
      cur.qty += Math.abs(l.delta_quantity);
      productRev.set(key, cur);
    });
    const topProducts = [...productRev.values()].sort((a, b) => b.value - a.value).slice(0, 5);
    return { stockMat, stockProd, revenue, purchasesTotal, matCost, losses, gross, topProducts };
  }, [ledger, purchases, materials, products, since]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Finances</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Rapport financier</h1>
          <p className="mt-1 text-sm text-muted-foreground">Valeur du stock, achats, ventes, pertes et bénéfice brut estimé.</p>
        </div>
        <div className="flex rounded-full border border-border bg-card p-1">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)} className={`px-3 py-1.5 text-xs rounded-full transition-colors ${range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi icon={Wallet} label="Valeur du stock" value={formatMoney(stats.stockMat + stats.stockProd)} sub={`Matières ${formatMoney(stats.stockMat)} · Produits ${formatMoney(stats.stockProd)}`} />
        <Kpi icon={Package2} label="Achats" value={formatMoney(stats.purchasesTotal)} />
        <Kpi icon={ShoppingBag} label="Chiffre d'affaires" value={formatMoney(stats.revenue)} />
        <Kpi icon={stats.gross >= 0 ? TrendingUp : TrendingDown} label="Bénéfice brut" value={formatMoney(stats.gross)} sub={`Coût matières ${formatMoney(stats.matCost)} · Pertes ${formatMoney(stats.losses)}`} />
      </div>

      <div className="card-elegant p-6">
        <div className="flex items-center gap-2 mb-4">
          <LineChart className="h-4 w-4 text-accent" />
          <h2 className="font-display text-xl">Top produits</h2>
        </div>
        {stats.topProducts.length === 0 && <p className="text-sm text-muted-foreground">Pas encore de ventes sur la période.</p>}
        <div className="space-y-2">
          {stats.topProducts.map((p, i) => {
            const max = stats.topProducts[0].value || 1;
            return (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1"><span>{p.name}</span><span className="text-muted-foreground">{formatMoney(p.value)}</span></div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-[var(--gradient-crust)]" style={{ width: `${(p.value / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
        Le <strong>bénéfice brut</strong> est estimé comme : chiffre d'affaires − coût matières consommées (fournées) − pertes (invendus valorisés). Il ne tient pas compte des charges (loyer, salaires, énergie).
      </div>
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
