import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBakery, useProducts, useQuickSale, useLedger } from "@/lib/queries";
import { useOfflineQueue } from "@/lib/offline-queue";
import { useOnlineStatus } from "@/lib/offline";
import { formatDateTime, formatMoney, formatQty, UNIT_LABEL } from "@/lib/format";
import { Plus, ShoppingBag, AlertTriangle, Search, Clock, Wallet } from "lucide-react";
import { Badge } from "@/components/Loader";
import { Modal, Field, inputCls } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/sales")({ component: SalesPage });

function SalesPage() {
  const { data: bakery } = useBakery();
  const { data: ledger = [] } = useLedger(200);
  const pendingSales = useOfflineQueue().filter((a) => a.kind.startsWith("sale."));
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");

  type LedgerRow = typeof ledger[number];
  type SaleRow = LedgerRow & { linkedLoss?: LedgerRow };

  const recentSales = useMemo<SaleRow[]>(() => {
    const bySaleId = new Map<string, SaleRow>();
    const standaloneLosses: SaleRow[] = [];

    for (const l of ledger) {
      if (l.kind === "sale") bySaleId.set(l.id, { ...l });
    }
    for (const l of ledger) {
      if (l.kind === "loss") {
        const parent = l.ref_id ? bySaleId.get(l.ref_id) : undefined;
        if (parent) parent.linkedLoss = l;
        else standaloneLosses.push(l as SaleRow);
      }
    }

    const rows = [...bySaleId.values(), ...standaloneLosses].sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1
    );

    return rows
      .filter((l) => {
        if (q) {
          const name = (l.products?.name ?? l.raw_materials?.name ?? "").toLowerCase();
          if (!name.includes(q.toLowerCase())) return false;
        }
        if (date && new Date(l.created_at).toISOString().slice(0, 10) !== date) return false;
        return true;
      })
      .slice(0, 100);
  }, [ledger, q, date]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCA = ledger
    .filter((l) => l.kind === "sale" && l.created_at.slice(0, 10) === todayStr)
    .reduce((s, l) => s + l.delta_value, 0);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-[var(--gradient-warm)] px-5 py-7 sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.62 0.11 55 / 0.26), transparent 70%)" }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="icon-medallion h-12 w-12 shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-accent">Ventes</p>
              <h1 className="mt-1 font-display text-3xl sm:text-4xl">Enregistrer une vente</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" />
                <span>Chiffre d'affaires du jour <strong className="stat-figure text-foreground">{formatMoney(todayCA)}</strong></span>
                {pendingSales.length > 0 && <Badge tone="accent">{pendingSales.length} en attente</Badge>}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="btn-press btn-shimmer inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-[var(--shadow-soft)]"
          >
            <Plus className="h-4 w-4" /> Nouvelle vente
          </button>
        </div>
      </div>

      {pendingSales.length > 0 && (
        <div className="card-elegant overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-xs uppercase tracking-widest text-accent">
            <Clock className="h-3.5 w-3.5" />
            En attente de synchronisation ({pendingSales.length})
          </div>
          <ul className="divide-y divide-border">
            {pendingSales.map((p) => (
              <li key={p.local_id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(p.queued_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {formatQty(Number((p.payload as any).quantity_sold ?? 0), "")}
                  </p>
                  <p className="text-sm font-medium stat-figure">
                    {formatMoney(
                      Number((p.payload as any).quantity_sold ?? 0) *
                        Number((p.payload as any).unit_price ?? 0)
                    )}
                  </p>
                </div>
              </li>

            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par produit…"
            className="w-full rounded-full border border-input bg-card pl-9 pr-4 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-full border border-input bg-card px-4 py-2 text-xs outline-none focus:border-accent"
        />
      </div>

      <div className="card-elegant overflow-hidden">
        <div className="border-b border-border px-5 py-3 text-xs uppercase tracking-widest text-muted-foreground">
          Journal des ventes récentes
        </div>
        {recentSales.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <ShoppingBag className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Aucune vente enregistrée.
          </div>
        )}
        <ul className="divide-y divide-border">
          {recentSales.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-secondary/30 transition-colors">
              <div className="min-w-0">
                <p className="font-medium truncate flex items-center gap-2">
                  {l.products?.name ?? l.raw_materials?.name ?? "—"}
                  <Badge tone={l.kind === "sale" ? "accent" : "warning"}>
                    {l.kind === "sale" ? "Vente" : "Perte"}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</p>
                {l.linkedLoss && (
                  <p className="mt-0.5 text-xs text-destructive">
                    dont perte (invendus jetés) : −{formatMoney(Math.abs(l.linkedLoss.delta_value))}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground stat-figure">
                  {formatQty(
                    Math.abs(l.delta_quantity),
                    UNIT_LABEL[l.products?.unit ?? l.raw_materials?.unit ?? "unite"]
                  )}
                </p>
                <p
                  className={`text-sm font-medium stat-figure ${l.kind === "sale" ? "" : "text-destructive"}`}
                >
                  {formatMoney(Math.abs(l.delta_value))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showNew && bakery && (
        <Modal title="Nouvelle vente" onClose={() => setShowNew(false)}>
          <QuickSaleForm bakeryId={bakery.id} onDone={() => setShowNew(false)} />
        </Modal>
      )}
    </div>
  );
}

function QuickSaleForm({ bakeryId, onDone }: { bakeryId: string; onDone: () => void }) {
  const { data: products = [] } = useProducts();
  const sale = useQuickSale();
  const online = useOnlineStatus();
  const [productId, setProductId] = useState("");
  const [unsold, setUnsold] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [kept, setKept] = useState<number>(0);
  const [thrown, setThrown] = useState<number>(0);

  const product = products.find((p) => p.id === productId);
  const stock = product?.stock ?? 0;
  const price = product?.sale_price ?? 0;
  const effectivePrice = unitPrice || price;

  const vendus = Math.max(0, stock - unsold);
  const ca = vendus * effectivePrice;
  const stockValue = stock * effectivePrice;

  const overUnsold = unsold > stock;
  const splitTotal = kept + thrown;
  const splitExceeds = splitTotal > unsold;
  const remaining = Math.max(0, unsold - splitTotal);

  const canSubmit =
    !!productId &&
    !overUnsold &&
    unsold >= 0 &&
    effectivePrice >= 0 &&
    !splitExceeds &&
    kept >= 0 &&
    thrown >= 0 &&
    !sale.isPending;

  function onSelectProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setUnitPrice(p?.sale_price ?? 0);
    setUnsold(0);
    setKept(0);
    setThrown(0);
  }

  function onUnsoldChange(v: number) {
    setUnsold(v);
    setKept(v);
    setThrown(0);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !product) return;
    const keptFinal = kept + remaining;
    sale.mutate(
      {
        bakery_id: bakeryId,
        product_id: product.id,
        product_name: product.name,
        quantity_sold: vendus,
        unit_price: effectivePrice,
        kept_quantity: keptFinal,
        thrown_quantity: thrown,
      },
      { onSuccess: onDone }
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!online && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-xs text-accent">
          Hors ligne : cette vente sera enregistrée sur l'appareil et envoyée automatiquement au
          retour du réseau. Le stock affiché ci-dessous ne tient pas compte d'éventuelles autres
          ventes hors ligne pas encore synchronisées.
        </div>
      )}

      <Field label="Produit">
        <select
          required
          value={productId}
          onChange={(e) => onSelectProduct(e.target.value)}
          className={inputCls}
        >
          <option value="">— Choisir un produit —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      {product && (
        <>
          <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stock actuel</span>
              <strong className="stat-figure">{formatQty(stock, UNIT_LABEL[product.unit])}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prix unitaire</span>
              <strong className="stat-figure">{formatMoney(effectivePrice)}</strong>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-1 mt-1">
              <span className="text-muted-foreground">Valeur totale du stock</span>
              <strong className="stat-figure">{formatMoney(stockValue)}</strong>
            </div>
          </div>

          <Field label={`Invendus (en ${UNIT_LABEL[product.unit]})`}>
            <input
              type="number"
              min={0}
              max={stock}
              step="0.01"
              value={unsold}
              onChange={(e) => onUnsoldChange(+e.target.value)}
              className={inputCls + (overUnsold ? " border-destructive" : "")}
            />
          </Field>

          {overUnsold && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Les invendus dépassent le stock disponible.
            </p>
          )}

          <Field label="Prix unitaire (FCFA)">
            <input
              type="number"
              min={0}
              step="1"
              value={unitPrice || ""}
              onChange={(e) => setUnitPrice(+e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="rounded-xl border border-border p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendues</span>
              <strong className="stat-figure">{formatQty(vendus, UNIT_LABEL[product.unit])}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chiffre d'affaires</span>
              <strong className="stat-figure text-accent">{formatMoney(ca)}</strong>
            </div>
          </div>

          {unsold > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Que faire des {formatQty(unsold, UNIT_LABEL[product.unit])} invendus ?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Conservés en stock">
                  <input
                    type="number"
                    min={0}
                    max={unsold}
                    step="0.01"
                    value={kept}
                    onChange={(e) => setKept(+e.target.value)}
                    className={inputCls + (splitExceeds ? " border-destructive" : "")}
                  />
                </Field>
                <Field label="Jetés (perte)">
                  <input
                    type="number"
                    min={0}
                    max={unsold}
                    step="0.01"
                    value={thrown}
                    onChange={(e) => setThrown(+e.target.value)}
                    className={inputCls + (splitExceeds ? " border-destructive" : "")}
                  />
                </Field>
              </div>
              {splitExceeds ? (
                <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  La somme des deux ({formatQty(splitTotal, UNIT_LABEL[product.unit])}) dépasse les invendus.
                </p>
              ) : remaining > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatQty(remaining, UNIT_LABEL[product.unit])} restants seront considérés comme conservés en stock.
                </p>
              ) : null}
            </div>
          )}
        </>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-press btn-shimmer w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-50"
      >
        {sale.isPending ? "Enregistrement…" : "Enregistrer la vente"}
      </button>
    </form>
  );
}