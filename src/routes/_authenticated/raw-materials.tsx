import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useBakery, useRawMaterials, useCreateRawMaterial, useUpdateRawMaterial, useDeleteRawMaterial, useCreatePurchase } from "@/lib/queries";
import { formatMoney, formatQty, MATERIAL_UNITS, UNIT_LABEL } from "@/lib/format";
import { Plus, Search, Package2, Trash2, PackagePlus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/raw-materials")({ component: RawMaterialsPage });

function RawMaterialsPage() {
  const { data: bakery } = useBakery();
  const { data: materials = [] } = useRawMaterials();
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [restockFor, setRestockFor] = useState<string | null>(null);

  const create = useCreateRawMaterial();
  const update = useUpdateRawMaterial();
  const del = useDeleteRawMaterial();
  const purchase = useCreatePurchase();

  const filtered = useMemo(
    () => materials.filter((m) => m.name.toLowerCase().includes(q.toLowerCase())),
    [materials, q]
  );

  const restockMat = materials.find((m) => m.id === restockFor);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Matières premières</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Farine, sucre, levure…</h1>
          <p className="mt-1 text-sm text-muted-foreground">Prix d'achat, coût moyen, stock et seuils.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
          <Plus className="h-4 w-4" /> Nouvelle matière
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="w-full rounded-full border border-input bg-card pl-9 pr-4 py-2 text-sm outline-none focus:border-accent" />
      </div>

      <div className="card-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Matière</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Seuil</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Prix d'achat</th>
                <th className="text-right px-4 py-3">Coût moyen</th>
                <th className="text-right px-4 py-3">Valeur</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Package2 className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Aucune matière. Commencez par en ajouter une.
                </td></tr>
              )}
              {filtered.map((m) => {
                const low = m.stock <= m.low_stock_threshold;
                return (
                  <tr key={m.id} className={low ? "bg-destructive/5" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{UNIT_LABEL[m.unit]}</p>
                    </td>
                    <td className={`px-4 py-3 text-right ${low ? "text-destructive" : ""}`}>{formatQty(m.stock, UNIT_LABEL[m.unit])}</td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">{formatQty(m.low_stock_threshold, UNIT_LABEL[m.unit])}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">{formatMoney(m.purchase_price)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(m.avg_cost)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(m.stock * m.avg_cost)}</td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setRestockFor(m.id)} className="rounded-lg p-2 hover:bg-secondary" title="Réapprovisionner">
                          <PackagePlus className="h-4 w-4 text-accent" />
                        </button>
                        <button onClick={() => { if (confirm(`Supprimer « ${m.name} » ?`)) del.mutate(m.id); }} className="rounded-lg p-2 hover:bg-secondary" title="Supprimer">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && bakery && (
        <Modal title="Nouvelle matière" onClose={() => setShowNew(false)}>
          <MaterialForm
            submitting={create.isPending}
            onSubmit={(v) => create.mutate({ bakery_id: bakery.id, ...v }, { onSuccess: () => setShowNew(false) })}
          />
        </Modal>
      )}

      {restockMat && bakery && (
        <Modal title={`Réapprovisionner ${restockMat.name}`} onClose={() => setRestockFor(null)}>
          <RestockForm
            unit={UNIT_LABEL[restockMat.unit]}
            defaultPrice={restockMat.purchase_price}
            submitting={purchase.isPending}
            onSubmit={(v) => purchase.mutate(
              { bakery_id: bakery.id, raw_material_id: restockMat.id, ...v },
              { onSuccess: () => setRestockFor(null) }
            )}
          />
        </Modal>
      )}
    </div>
  );
}

function MaterialForm({ onSubmit, submitting }: { onSubmit: (v: any) => void; submitting: boolean }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<typeof MATERIAL_UNITS[number]>("kg");
  const [purchase_price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [low_stock_threshold, setThreshold] = useState(0);
  const [notes, setNotes] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (purchase_price <= 0) return; onSubmit({ name, unit, purchase_price, stock, low_stock_threshold, notes: notes || null }); }} className="space-y-3">
      <Field label="Nom"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Farine T55" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unité">
          <select value={unit} onChange={(e) => setUnit(e.target.value as any)} className={inputCls}>
            {MATERIAL_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
          </select>
        </Field>
        <Field label="Prix d'achat unitaire (FCFA)"><input type="number" required min={0.01} step="0.01" value={purchase_price} onChange={(e) => setPrice(+e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stock initial"><input type="number" min={0} step="0.01" value={stock} onChange={(e) => setStock(+e.target.value)} className={inputCls} /></Field>
        <Field label="Seuil bas"><input type="number" min={0} step="0.01" value={low_stock_threshold} onChange={(e) => setThreshold(+e.target.value)} className={inputCls} /></Field>
      </div>
      <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} /></Field>
      <button disabled={submitting} className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-60">Enregistrer</button>
    </form>
  );
}

function RestockForm({ onSubmit, submitting, defaultPrice, unit }: { onSubmit: (v: any) => void; submitting: boolean; defaultPrice: number; unit: string }) {
  const [quantity, setQ] = useState(0);
  const [unit_price, setP] = useState(defaultPrice);
  const [supplier, setS] = useState("");
  const [notes, setN] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (quantity <= 0 || unit_price <= 0) return; onSubmit({ quantity, unit_price, supplier: supplier || null, notes: notes || null }); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Quantité (${unit})`}><input type="number" required min={0.01} step="0.01" value={quantity} onChange={(e) => setQ(+e.target.value)} className={inputCls} /></Field>
        <Field label="Prix unitaire (FCFA)"><input type="number" required min={0.01} step="0.01" value={unit_price} onChange={(e) => setP(+e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">Total : <strong>{formatMoney(quantity * unit_price)}</strong></div>
      <Field label="Fournisseur"><input value={supplier} onChange={(e) => setS(e.target.value)} className={inputCls} /></Field>
      <Field label="Notes"><textarea value={notes} onChange={(e) => setN(e.target.value)} className={inputCls} rows={2} /></Field>
      <button disabled={submitting} className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-60">Enregistrer le réapprovisionnement</button>
    </form>
  );
}

// Shared UI helpers
export const inputCls = "w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors";
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>;
}
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm p-4 animate-fade-up">
      <div className="flex w-full max-w-lg flex-col max-h-[85dvh] rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)]">
        <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-4">
          <h3 className="font-display text-xl">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
