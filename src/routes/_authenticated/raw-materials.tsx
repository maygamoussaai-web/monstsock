import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  useBakery,
  useRawMaterials,
  useCreateRawMaterial,
  useUpdateRawMaterial,
  useDeleteRawMaterial,
  useCreatePurchase,
  type RawMaterial,
} from "@/lib/queries";
import { formatMoney, formatQty, MATERIAL_UNITS, UNIT_LABEL } from "@/lib/format";
import { Plus, Search, Package2, Trash2, PackagePlus, Pencil } from "lucide-react";
import { Modal, Field, inputCls } from "@/components/Modal";

// Re-exports pour compatibilité avec anciens imports (au cas où)
export { Modal, Field, inputCls } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/raw-materials")({
  component: RawMaterialsPage,
});

function RawMaterialsPage() {
  const { data: bakery } = useBakery();
  const { data: materials = [] } = useRawMaterials();
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [restockFor, setRestockFor] = useState<string | null>(null);
  const [detailFor, setDetailFor] = useState<string | null>(null);

  const create = useCreateRawMaterial();
  const purchase = useCreatePurchase();

  const filtered = useMemo(
    () => materials.filter((m) => m.name.toLowerCase().includes(q.toLowerCase())),
    [materials, q]
  );

  const restockMat = materials.find((m) => m.id === restockFor);
  const detailMat = materials.find((m) => m.id === detailFor);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Matières premières
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Farine, sucre, levure…</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prix d'achat, coût moyen, stock et seuils.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Nouvelle matière
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-full border border-input bg-card pl-9 pr-4 py-2 text-sm outline-none focus:border-accent"
        />
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
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    <Package2 className="mx-auto mb-2 h-6 w-6 opacity-40" />
                    Aucune matière. Commencez par en ajouter une.
                  </td>
                </tr>
              )}
              {filtered.map((m) => {
                const low = m.stock <= m.low_stock_threshold;
                return (
                  <tr
                    key={m.id}
                    onClick={() => setDetailFor(m.id)}
                    className={`cursor-pointer hover:bg-secondary/30 transition-colors ${low ? "bg-destructive/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{UNIT_LABEL[m.unit]}</p>
                    </td>
                    <td className={`px-4 py-3 text-right ${low ? "text-destructive" : ""}`}>
                      {formatQty(m.stock, UNIT_LABEL[m.unit])}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
                      {formatQty(m.low_stock_threshold, UNIT_LABEL[m.unit])}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {formatMoney(m.purchase_price)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(m.avg_cost)}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(m.stock * m.avg_cost)}
                    </td>
                    <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setRestockFor(m.id)}
                        className="rounded-lg p-2 hover:bg-secondary"
                        title="Réapprovisionner"
                      >
                        <PackagePlus className="h-4 w-4 text-accent" />
                      </button>
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
            onSubmit={(v) =>
              create.mutate({ bakery_id: bakery.id, ...v }, { onSuccess: () => setShowNew(false) })
            }
          />
        </Modal>
      )}

      {restockMat && bakery && (
        <Modal title={`Réapprovisionner ${restockMat.name}`} onClose={() => setRestockFor(null)}>
          <RestockForm
            unit={UNIT_LABEL[restockMat.unit]}
            defaultPrice={restockMat.purchase_price}
            submitting={purchase.isPending}
            onSubmit={(v) =>
              purchase.mutate(
                { bakery_id: bakery.id, raw_material_id: restockMat.id, ...v },
                { onSuccess: () => setRestockFor(null) }
              )
            }
          />
        </Modal>
      )}

      {detailMat && (
        <MaterialDetail material={detailMat} onClose={() => setDetailFor(null)} />
      )}
    </div>
  );
}

function MaterialDetail({ material, onClose }: { material: RawMaterial; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateRawMaterial();
  const del = useDeleteRawMaterial();
  const [form, setForm] = useState({
    name: material.name,
    unit: material.unit,
    purchase_price: material.purchase_price,
    low_stock_threshold: material.low_stock_threshold,
    notes: material.notes ?? "",
  });

  const unitLabel = UNIT_LABEL[material.unit];

  function save() {
    update.mutate(
      {
        id: material.id,
        name: form.name,
        unit: form.unit,
        purchase_price: form.purchase_price,
        low_stock_threshold: form.low_stock_threshold,
        notes: form.notes || null,
      },
      { onSuccess: () => setEditing(false) }
    );
  }

  return (
    <Modal title={material.name} subtitle="Fiche matière" onClose={onClose}>
      {!editing ? (
        <div className="space-y-3 text-sm">
          <Row label="Unité" value={unitLabel} />
          <Row
            label="Stock actuel"
            value={<strong>{formatQty(material.stock, unitLabel)}</strong>}
          />
          <Row
            label="Seuil bas"
            value={formatQty(material.low_stock_threshold, unitLabel)}
          />
          <Row label="Prix d'achat" value={formatMoney(material.purchase_price)} />
          <Row label="Coût moyen" value={formatMoney(material.avg_cost)} />
          <Row
            label="Valeur du stock"
            value={<strong>{formatMoney(material.stock * material.avg_cost)}</strong>}
          />
          {material.notes && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Notes</p>
              <p className="rounded-xl bg-secondary/50 px-3 py-2 whitespace-pre-wrap">
                {material.notes}
              </p>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground italic pt-2">
            Le stock évolue uniquement via réapprovisionnement ou consommation en fournée.
          </p>
          <div className="flex gap-2 pt-3">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm text-primary-foreground"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </button>
            <button
              onClick={() => {
                if (confirm(`Supprimer « ${material.name} » ?`)) {
                  del.mutate({ id: material.id, stock: material.stock }, { onSuccess: onClose });
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-destructive/40 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Nom">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unité">
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value as any })}
                className={inputCls}
              >
                {MATERIAL_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prix d'achat (FCFA)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.purchase_price}
                onChange={(e) => setForm({ ...form, purchase_price: +e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Seuil bas">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.low_stock_threshold}
              onChange={(e) => setForm({ ...form, low_stock_threshold: +e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputCls}
            />
          </Field>
          <p className="text-[11px] text-muted-foreground italic">
            Le stock n'est pas modifiable ici.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={save}
              disabled={update.isPending}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function MaterialForm({ onSubmit, submitting }: { onSubmit: (v: any) => void; submitting: boolean }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<(typeof MATERIAL_UNITS)[number]>("kg");
  const [purchase_price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [low_stock_threshold, setThreshold] = useState(0);
  const [notes, setNotes] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (purchase_price <= 0) return;
        onSubmit({
          name,
          unit,
          purchase_price,
          stock,
          low_stock_threshold,
          notes: notes || null,
        });
      }}
      className="space-y-3"
    >
      <Field label="Nom">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Farine T55"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unité">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as any)}
            className={inputCls}
          >
            {MATERIAL_UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABEL[u]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prix d'achat unitaire (FCFA)">
          <input
            type="number"
            required
            min={0.01}
            step="0.01"
            value={purchase_price || ""}
            onChange={(e) => setPrice(+e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stock initial">
          <input
            type="number"
            min={0}
            step="0.01"
            value={stock || ""}
            onChange={(e) => setStock(+e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Seuil bas">
          <input
            type="number"
            min={0}
            step="0.01"
            value={low_stock_threshold || ""}
            onChange={(e) => setThreshold(+e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
          rows={2}
        />
      </Field>
      <button
        disabled={submitting}
        className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-60"
      >
        Enregistrer
      </button>
    </form>
  );
}

function RestockForm({
  onSubmit,
  submitting,
  defaultPrice,
  unit,
}: {
  onSubmit: (v: any) => void;
  submitting: boolean;
  defaultPrice: number;
  unit: string;
}) {
  const [quantity, setQ] = useState(0);
  const [unit_price, setP] = useState(defaultPrice);
  const [supplier, setS] = useState("");
  const [notes, setN] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (quantity <= 0 || unit_price <= 0) return;
        onSubmit({
          quantity,
          unit_price,
          supplier: supplier || null,
          notes: notes || null,
        });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Quantité (${unit})`}>
          <input
            type="number"
            required
            min={0.01}
            step="0.01"
            value={quantity || ""}
            onChange={(e) => setQ(+e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Prix unitaire (FCFA)">
          <input
            type="number"
            required
            min={0.01}
            step="0.01"
            value={unit_price || ""}
            onChange={(e) => setP(+e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
        Total : <strong>{formatMoney(quantity * unit_price)}</strong>
      </div>
      <Field label="Fournisseur">
        <input value={supplier} onChange={(e) => setS(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setN(e.target.value)}
          className={inputCls}
          rows={2}
        />
      </Field>
      <button
        disabled={submitting}
        className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-60"
      >
        Enregistrer le réapprovisionnement
      </button>
    </form>
  );
}
