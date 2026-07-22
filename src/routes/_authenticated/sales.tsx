import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBakery, useProducts, useQuickSale, useLedger } from "@/lib/queries";
import { formatDateTime, formatMoney, formatQty, UNIT_LABEL } from "@/lib/format";
import { Plus, ShoppingBag, AlertTriangle, Search } from "lucide-react";
import { Modal, Field, inputCls } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/sales")({ component: SalesPage });

function SalesPage() {
  const { data: bakery } = useBakery();
  const { data: ledger = [] } = useLedger(500);
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");

  const recentSales = useMemo(
    () =>
      ledger
        .filter((l) => l.kind === "sale" || l.kind === "loss")
        .filter((l) => {
          if (q) {
            const name = (l.products?.name ?? l.raw_materials?.name ?? "").toLowerCase();
            if (!name.includes(q.toLowerCase())) return false;
          }
          if (date && new Date(l.created_at).toISOString().slice(0, 10) !== date) return false;
          return true;
        })
        .slice(0, 100),
    [ledger, q, date]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Ventes</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Enregistrer une vente</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez un produit, indiquez les invendus, la vente est calculée automatiquement.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Nouvelle vente
        </button>
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
            <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {l.products?.name ?? l.raw_materials?.name ?? "—"}
                  <span
                    className={`ml-2 text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 ${l.kind === "sale" ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive"}`}
                  >
                    {l.kind === "sale" ? "Vente" : "Perte"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">
                  {formatQty(
                    Math.abs(l.delta_quantity),
                    UNIT_LABEL[l.products?.unit ?? l.raw_materials?.unit ?? "unite"]
                  )}
                </p>
                <p
                  className={`text-sm font-medium ${l.kind === "sale" ? "" : "text-destructive"}`}
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
  const [productId, setProductId] = useState("");
  const [unsold, setUnsold] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [keepUnsold, setKeepUnsold] = useState<boolean | null>(null);

  const product = products.find((p) => p.id === productId);
  const stock = product?.stock ?? 0;
  const price = product?.sale_price ?? 0;
  const effectivePrice = unitPrice || price;

  const vendus = Math.max(0, stock - unsold);
  const ca = vendus * effectivePrice;
  const stockValue = stock * effectivePrice;

  const overUnsold = unsold > stock;
  const canSubmit =
    !!productId &&
    !overUnsold &&
    unsold >= 0 &&
    effectivePrice >= 0 &&
    (unsold === 0 || keepUnsold !== null) &&
    !sale.isPending;

  function onSelectProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setUnitPrice(p?.sale_price ?? 0);
    setUnsold(0);
    setKeepUnsold(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !product) return;
    sale.mutate(
      {
        bakery_id: bakeryId,
        product_id: product.id,
        quantity_sold: vendus,
        unit_price: effectivePrice,
        unsold,
        keep_unsold: unsold === 0 ? true : (keepUnsold ?? true),
      },
      { onSuccess: onDone }
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
              <strong>{formatQty(stock, UNIT_LABEL[product.unit])}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prix unitaire</span>
              <strong>{formatMoney(effectivePrice)}</strong>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-1 mt-1">
              <span className="text-muted-foreground">Valeur totale du stock</span>
              <strong>{formatMoney(stockValue)}</strong>
            </div>
          </div>

          <Field label={`Invendus (en ${UNIT_LABEL[product.unit]})`}>
            <input
              type="number"
              min={0}
              max={stock}
              step="0.01"
              value={unsold}
              onChange={(e) => setUnsold(+e.target.value)}
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
              <strong>{formatQty(vendus, UNIT_LABEL[product.unit])}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chiffre d'affaires</span>
              <strong className="text-accent">{formatMoney(ca)}</strong>
            </div>
          </div>

          {unsold > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Conserver les invendus ?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setKeepUnsold(true)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${keepUnsold === true ? "border-accent bg-accent/10 text-accent" : "border-border"}`}
                >
                  Oui, garder en stock
                </button>
                <button
                  type="button"
                  onClick={() => setKeepUnsold(false)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${keepUnsold === false ? "border-destructive bg-destructive/10 text-destructive" : "border-border"}`}
                >
                  Non, à jeter (perte)
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-50"
      >
        {sale.isPending ? "Enregistrement…" : "Enregistrer la vente"}
      </button>
    </form>
  );
}
