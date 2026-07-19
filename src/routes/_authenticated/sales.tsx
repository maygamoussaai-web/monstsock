import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useBakery, useProducts, useSalesSessions, useCreateSalesSession, useCloseSalesSession } from "@/lib/queries";
import { formatDate, formatDateTime, formatMoney, formatQty, UNIT_LABEL } from "@/lib/format";
import { Plus, ShoppingBag, CheckCircle2, Trash2 } from "lucide-react";
import { Modal, Field, inputCls } from "./raw-materials";

export const Route = createFileRoute("/_authenticated/sales")({ component: SalesPage });

function SalesPage() {
  const { data: bakery } = useBakery();
  const { data: sessions = [] } = useSalesSessions(30);
  const [showNew, setShowNew] = useState(false);
  const closeSession = useCloseSalesSession();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Ventes</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Sessions de vente</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ouvrez une session, saisissez stocks et invendus, clôturez pour calculer les ventes.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
          <Plus className="h-4 w-4" /> Nouvelle session
        </button>
      </div>

      <div className="space-y-3">
        {sessions.length === 0 && (
          <div className="card-elegant p-10 text-center text-sm text-muted-foreground">
            <ShoppingBag className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Aucune session enregistrée.
          </div>
        )}
        {sessions.map((s) => (
          <div key={s.id} className="card-elegant p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg">{s.name}</h3>
                  <span className={`text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 ${s.status === "closed" ? "bg-secondary text-muted-foreground" : "bg-accent/15 text-accent"}`}>{s.status === "closed" ? "Clôturée" : "Ouverte"}</span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(s.session_date)} · {formatDateTime(s.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Chiffre d'affaires</p>
                <p className="font-display text-lg">{formatMoney(s.total_revenue)}</p>
                {s.total_loss_value > 0 && <p className="text-xs text-destructive">Pertes {formatMoney(s.total_loss_value)}</p>}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Produit</th>
                    <th className="text-right py-2">Ouverture</th>
                    <th className="text-right py-2">Réappro</th>
                    <th className="text-right py-2">Clôture</th>
                    <th className="text-right py-2">Invendus</th>
                    <th className="text-right py-2">Vendues</th>
                    <th className="text-right py-2">CA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {s.sales_session_items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2">{it.products?.name}</td>
                      <td className="text-right">{formatQty(it.opening_stock)}</td>
                      <td className="text-right">{formatQty(it.restocked)}</td>
                      <td className="text-right">{formatQty(it.closing_stock)}</td>
                      <td className="text-right text-destructive">{formatQty(it.unsold)}</td>
                      <td className="text-right font-medium">{formatQty(it.quantity_sold)}</td>
                      <td className="text-right">{formatMoney(it.quantity_sold * it.price_at_sale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {s.status === "open" && (
              <div className="mt-4 flex justify-end">
                <button onClick={() => { if (confirm("Clôturer cette session ? Les ventes seront calculées et le stock mis à jour.")) closeSession.mutate(s.id); }} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm text-accent-foreground">
                  <CheckCircle2 className="h-4 w-4" /> Clôturer la session
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showNew && bakery && <NewSessionModal bakeryId={bakery.id} onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NewSessionModal({ bakeryId, onClose }: { bakeryId: string; onClose: () => void }) {
  const { data: products = [] } = useProducts();
  const create = useCreateSalesSession();

  const [name, setName] = useState(`Vente ${new Date().toLocaleDateString("fr-FR")}`);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<{ product_id: string; opening_stock: number; restocked: number; closing_stock: number; unsold: number; price_at_sale: number }[]>([]);
  const [pid, setPid] = useState("");

  function addProduct() {
    const p = products.find((x) => x.id === pid);
    if (!p || items.find((i) => i.product_id === p.id)) return;
    setItems([...items, { product_id: p.id, opening_stock: p.stock, restocked: 0, closing_stock: 0, unsold: 0, price_at_sale: p.sale_price }]);
    setPid("");
  }

  function update(idx: number, patch: any) {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  return (
    <Modal title="Nouvelle session de vente" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Produits en vente</p>
          <div className="space-y-2">
            {items.map((it, idx) => {
              const p = products.find((x) => x.id === it.product_id)!;
              return (
                <div key={it.product_id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{p.name} <span className="text-xs text-muted-foreground">({UNIT_LABEL[p.unit]})</span></p>
                    <button onClick={() => setItems(items.filter((_, k) => k !== idx))} className="rounded p-1 hover:bg-secondary"><Trash2 className="h-4 w-4 text-destructive" /></button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <MiniField label="Ouverture" v={it.opening_stock} onChange={(v) => update(idx, { opening_stock: v })} />
                    <MiniField label="Réappro" v={it.restocked} onChange={(v) => update(idx, { restocked: v })} />
                    <MiniField label="Clôture" v={it.closing_stock} onChange={(v) => update(idx, { closing_stock: v })} />
                    <MiniField label="Invendus" v={it.unsold} onChange={(v) => update(idx, { unsold: v })} />
                    <MiniField label="Prix" v={it.price_at_sale} onChange={(v) => update(idx, { price_at_sale: v })} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 items-end">
            <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputCls}>
              <option value="">— ajouter un produit —</option>
              {products.filter((p) => !items.find((i) => i.product_id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="button" disabled={!pid} onClick={addProduct} className="rounded-xl bg-accent px-3 py-2.5 text-sm text-accent-foreground disabled:opacity-50">Ajouter</button>
          </div>
        </div>

        <button onClick={() => create.mutate({ bakery_id: bakeryId, name, session_date: date, items }, { onSuccess: onClose })} disabled={create.isPending || items.length === 0} className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-60">
          Ouvrir la session
        </button>
      </div>
    </Modal>
  );
}

function MiniField({ label, v, onChange }: { label: string; v: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type="number" min={0} step="0.01" value={v} onChange={(e) => onChange(+e.target.value)} className="mt-0.5 w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm outline-none focus:border-accent" />
    </label>
  );
}
