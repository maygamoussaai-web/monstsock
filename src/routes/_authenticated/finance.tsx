import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLedger, useRawMaterials, useProducts, usePurchases } from "@/lib/queries";
import { formatMoney, formatQty, formatDateTime, UNIT_LABEL } from "@/lib/format";
import { LineChart, Wallet, ShoppingBag, TrendingDown, TrendingUp, Package2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/finance")({ component: FinancePage });

const RANGES = [
  { key: "7", label: "7 jours", days: 7 },
  { key: "30", label: "30 jours", days: 30 },
  { key: "90", label: "90 jours", days: 90 },
  { key: "all", label: "Tout", days: 3650 },
] as const;

type DetailKey = null | "stock" | "purchases" | "revenue" | "losses";

function FinancePage() {
  const [range, setRange] = useState<typeof RANGES[number]["key"]>("30");
  const [detail, setDetail] = useState<DetailKey>(null);
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
    const sales = filt.filter((l) => l.kind === "sale");
    const revenue = sales.reduce((s, l) => s + l.delta_value, 0);
    const purchasesTotal = purch.reduce((s, p) => s + p.total_price, 0);
    const lossEntries = filt.filter((l) => l.kind === "loss");
    const matCost = filt.filter((l) => l.kind === "batch_consume").reduce((s, l) => s + Math.abs(l.delta_value), 0);
    const losses = lossEntries.reduce((s, l) => s + Math.abs(l.delta_value), 0);
    const gross = revenue - matCost - losses;

    const productRev = new Map<string, { name: string; value: number; qty: number }>();
    sales.filter((l) => l.product_id).forEach((l) => {
      const key = l.product_id!;
      const cur = productRev.get(key) ?? { name: l.products?.name ?? "—", value: 0, qty: 0 };
      cur.value += l.delta_value;
      cur.qty += Math.abs(l.delta_quantity);
      productRev.set(key, cur);
    });
    const topProducts = [...productRev.values()].sort((a, b) => b.value - a.value).slice(0, 5);
    return { stockMat, stockProd, revenue, purchasesTotal, matCost, losses, gross, topProducts, sales, purch, lossEntries };
  }, [ledger, purchases, materials, products, since]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Finances</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Rapport financier</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cliquez sur une carte pour voir le détail.</p>
        </div>
        <div className="flex rounded-full border border-border bg-card p-1">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)} className={`px-3 py-1.5 text-xs rounded-full transition-colors ${range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi onClick={() => setDetail("stock")} icon={Wallet} label="Valeur du stock" value={formatMoney(stats.stockMat + stats.stockProd)} sub={`Matières ${formatMoney(stats.stockMat)} · Produits ${formatMoney(stats.stockProd)}`} />
        <Kpi onClick={() => setDetail("purchases")} icon={Package2} label="Achats" value={formatMoney(stats.purchasesTotal)} />
        <Kpi onClick={() => setDetail("revenue")} icon={ShoppingBag} label="Chiffre d'affaires" value={formatMoney(stats.revenue)} />
        <Kpi onClick={() => setDetail("losses")} icon={stats.gross >= 0 ? TrendingUp : TrendingDown} label="Bénéfice brut" value={formatMoney(stats.gross)} sub={`Coût matières ${formatMoney(stats.matCost)} · Pertes ${formatMoney(stats.losses)}`} />
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

      {detail === "stock" && (
        <Modal title="Détail — Valeur du stock" onClose={() => setDetail(null)} size="lg">
          <StockDetail materials={materials} products={products} />
        </Modal>
      )}
      {detail === "purchases" && (
        <Modal title="Détail — Achats" onClose={() => setDetail(null)} size="lg">
          <PurchasesDetail purchases={stats.purch} />
        </Modal>
      )}
      {detail === "revenue" && (
        <Modal title="Détail — Chiffre d'affaires" onClose={() => setDetail(null)} size="lg">
          <SalesDetail sales={stats.sales} />
        </Modal>
      )}
      {detail === "losses" && (
        <Modal title="Détail — Pertes" onClose={() => setDetail(null)} size="lg">
          <LossesDetail losses={stats.lossEntries} />
        </Modal>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, onClick }: { icon: any; label: string; value: string; sub?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-elegant p-4 sm:p-5 text-left hover:border-accent/60 transition-colors focus:outline-none focus:border-accent"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] uppercase tracking-[0.2em]">{label}</p>
      </div>
      <p className="mt-2 font-display text-xl sm:text-2xl">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{sub}</p>}
    </button>
  );
}

function StockDetail({ materials, products }: { materials: any[]; products: any[] }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Matières premières</p>
        {materials.length === 0 && <p className="text-muted-foreground">Aucune matière.</p>}
        <ul className="divide-y divide-border">
          {materials.map((m) => (
            <li key={m.id} className="flex justify-between py-2 gap-2">
              <span className="truncate">{m.name}</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {formatQty(m.stock, UNIT_LABEL[m.unit])} · <strong className="text-foreground">{formatMoney(m.stock * (m.avg_cost || 0))}</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Produits finis</p>
        {products.length === 0 && <p className="text-muted-foreground">Aucun produit.</p>}
        <ul className="divide-y divide-border">
          {products.map((p) => (
            <li key={p.id} className="flex justify-between py-2 gap-2">
              <span className="truncate">{p.name}</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {formatQty(p.stock, UNIT_LABEL[p.unit])} · <strong className="text-foreground">{formatMoney(p.stock * (p.material_cost || 0))}</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PurchasesDetail({ purchases }: { purchases: any[] }) {
  if (purchases.length === 0) return <p className="text-sm text-muted-foreground">Aucun réapprovisionnement sur la période.</p>;
  return (
    <ul className="divide-y divide-border text-sm">
      {purchases.map((p) => (
        <li key={p.id} className="py-2 flex justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{p.raw_materials?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(p.created_at)} · {p.supplier ?? "—"}</p>
          </div>
          <div className="text-right shrink-0">
            <p>{formatQty(p.quantity, p.raw_materials?.unit ? UNIT_LABEL[p.raw_materials.unit] : "")}</p>
            <p className="text-xs text-accent">+{formatMoney(p.total_price)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SalesDetail({ sales }: { sales: any[] }) {
  if (sales.length === 0) return <p className="text-sm text-muted-foreground">Aucune vente sur la période.</p>;
  return (
    <ul className="divide-y divide-border text-sm">
      {sales.map((l) => (
        <li key={l.id} className="py-2 flex justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{l.products?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</p>
          </div>
          <div className="text-right shrink-0">
            <p>{formatQty(Math.abs(l.delta_quantity), l.products?.unit ? UNIT_LABEL[l.products.unit] : "")}</p>
            <p className="text-xs text-accent">+{formatMoney(l.delta_value)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LossesDetail({ losses }: { losses: any[] }) {
  if (losses.length === 0)
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> Aucune perte enregistrée sur la période.
      </p>
    );
  return (
    <ul className="divide-y divide-border text-sm">
      {losses.map((l) => {
        const name = l.products?.name ?? l.raw_materials?.name ?? "—";
        const unit = l.products?.unit ?? l.raw_materials?.unit;
        return (
          <li key={l.id} className="py-2 flex justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(l.created_at)} · {l.note ?? "—"}</p>
            </div>
            <div className="text-right shrink-0">
              <p>{formatQty(Math.abs(l.delta_quantity), unit ? UNIT_LABEL[unit] : "")}</p>
              <p className="text-xs text-destructive">{formatMoney(-Math.abs(l.delta_value))}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
