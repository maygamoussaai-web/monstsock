import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useBakery,
  useProducts,
  useCreateProduct,
  useDeleteProduct,
  useRawMaterials,
  useRecipe,
  useUpsertRecipeLine,
  useDeleteRecipeLine,
  useUpdateProduct,
  type Product,
} from "@/lib/queries";
import { formatMoney, formatQty, PRODUCT_UNITS, UNIT_LABEL } from "@/lib/format";
import { Plus, Search, Croissant, Trash2, ChefHat, Pencil } from "lucide-react";
import { Modal, Field, inputCls } from "@/components/Modal";
import { BatchForm } from "@/components/BatchForm";

export const Route = createFileRoute("/_authenticated/products")({ component: ProductsPage });

function ProductsPage() {
  const { data: bakery } = useBakery();
  const { data: products = [] } = useProducts();
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [batchFor, setBatchFor] = useState<string | null>(null);
  const create = useCreateProduct();

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [products, q]
  );

  const detailProduct = products.find((p) => p.id === detailFor);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Produits fabriqués
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Baguettes, croissants, pains…</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recette, prix de vente, coût matière et stock.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Nouveau produit
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-full border border-input bg-card pl-9 pr-4 py-2 text-sm outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="card-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Produit</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Prix vente</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Coût matière</th>
                <th className="text-right px-4 py-3">Marge</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    <Croissant className="mx-auto mb-2 h-6 w-6 opacity-40" />
                    Aucun produit fabriqué. Créez-en un pour commencer.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const margin = (p.sale_price ?? 0) - (p.material_cost ?? 0);
                const low = p.stock <= p.low_stock_threshold;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setDetailFor(p.id)}
                    className={`cursor-pointer hover:bg-secondary/30 transition-colors ${low ? "bg-destructive/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{UNIT_LABEL[p.unit]}</p>
                    </td>
                    <td className={`px-4 py-3 text-right ${low ? "text-destructive" : ""}`}>
                      {formatQty(p.stock, UNIT_LABEL[p.unit])}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      {formatMoney(p.sale_price)}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-muted-foreground">
                      {formatMoney(p.material_cost)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${margin < 0 ? "text-destructive" : "text-accent"}`}
                    >
                      {formatMoney(margin)}
                    </td>
                    <td
                      className="px-2 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setBatchFor(p.id)}
                        className="rounded-lg p-2 hover:bg-secondary"
                        title="Nouvelle fournée"
                      >
                        <ChefHat className="h-4 w-4 text-accent" />
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
        <Modal title="Nouveau produit" onClose={() => setShowNew(false)}>
          <ProductForm
            submitting={create.isPending}
            onSubmit={(v) =>
              create.mutate({ bakery_id: bakery.id, ...v }, { onSuccess: () => setShowNew(false) })
            }
          />
        </Modal>
      )}

      {detailProduct && (
        <ProductDetail
          product={detailProduct}
          onClose={() => setDetailFor(null)}
          onOpenBatch={() => {
            setBatchFor(detailProduct.id);
            setDetailFor(null);
          }}
        />
      )}

      {batchFor && bakery && (
        <Modal title="Nouvelle fournée" onClose={() => setBatchFor(null)} size="lg">
          <BatchForm
            bakeryId={bakery.id}
            initialProductId={batchFor}
            onDone={() => setBatchFor(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function ProductDetail({
  product,
  onClose,
  onOpenBatch,
}: {
  product: Product;
  onClose: () => void;
  onOpenBatch: () => void;
}) {
  const [tab, setTab] = useState<"info" | "edit" | "recipe">("info");
  const update = useUpdateProduct();
  const del = useDeleteProduct();
  const [form, setForm] = useState({
    name: product.name,
    unit: product.unit,
    sale_price: product.sale_price,
    low_stock_threshold: product.low_stock_threshold,
    notes: product.notes ?? "",
  });

  const unitLabel = UNIT_LABEL[product.unit];
  const margin = (product.sale_price ?? 0) - (product.material_cost ?? 0);

  function save() {
    update.mutate(
      {
        id: product.id,
        name: form.name,
        unit: form.unit,
        sale_price: form.sale_price,
        low_stock_threshold: form.low_stock_threshold,
        notes: form.notes || null,
      },
      { onSuccess: () => setTab("info") }
    );
  }

  return (
    <Modal title={product.name} subtitle="Fiche produit" onClose={onClose} size="lg">
      <div className="mb-4 flex gap-1 rounded-xl bg-secondary/50 p-1">
        <TabBtn active={tab === "info"} onClick={() => setTab("info")}>Informations</TabBtn>
        <TabBtn active={tab === "edit"} onClick={() => setTab("edit")}>Modifier</TabBtn>
        <TabBtn active={tab === "recipe"} onClick={() => setTab("recipe")}>Recette</TabBtn>
      </div>

      {tab === "info" && (
        <div className="space-y-3 text-sm">
          <Row label="Unité" value={unitLabel} />
          <Row label="Stock actuel" value={<strong>{formatQty(product.stock, unitLabel)}</strong>} />
          <Row label="Seuil bas" value={formatQty(product.low_stock_threshold, unitLabel)} />
          <Row label="Prix de vente" value={formatMoney(product.sale_price)} />
          <Row label="Coût matière" value={formatMoney(product.material_cost)} />
          <Row
            label="Marge unitaire"
            value={
              <span className={margin < 0 ? "text-destructive" : "text-accent"}>
                <strong>{formatMoney(margin)}</strong>
              </span>
            }
          />
          <Row
            label="Valeur du stock"
            value={<strong>{formatMoney(product.stock * product.material_cost)}</strong>}
          />
          {product.notes && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Notes</p>
              <p className="rounded-xl bg-secondary/50 px-3 py-2 whitespace-pre-wrap">
                {product.notes}
              </p>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground italic pt-2">
            Le stock évolue uniquement lors d'une fournée ou d'une vente.
          </p>
          <div className="flex gap-2 pt-3">
            <button
              onClick={onOpenBatch}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm text-primary-foreground"
            >
              <ChefHat className="h-4 w-4" /> Nouvelle fournée
            </button>
            <button
              onClick={() => setTab("edit")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Supprimer « ${product.name} » ?`)) {
                  del.mutate({ id: product.id, stock: product.stock }, { onSuccess: onClose });
                }
              }}
              className="inline-flex items-center justify-center rounded-xl border border-destructive/40 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {tab === "edit" && (
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
                {PRODUCT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prix de vente (FCFA)">
              <input
                type="number"
                min={0}
                step="1"
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: +e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Seuil bas">
            <input
              type="number"
              min={0}
              step="1"
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
              onClick={() => setTab("info")}
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

      {tab === "recipe" && <RecipeEditor product={product} />}
    </Modal>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-1.5 text-xs transition-colors ${active ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
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

function ProductForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (v: any) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<(typeof PRODUCT_UNITS)[number]>("unite");
  const [sale_price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [low_stock_threshold, setT] = useState(0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, unit, sale_price, stock, low_stock_threshold });
      }}
      className="space-y-3"
    >
      <Field label="Nom">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Baguette tradition"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unité de vente">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as any)}
            className={inputCls}
          >
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABEL[u]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prix de vente (FCFA)">
          <input
            type="number"
            min={0}
            step="1"
            value={sale_price || ""}
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
            step="1"
            value={stock || ""}
            onChange={(e) => setStock(+e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Seuil bas">
          <input
            type="number"
            min={0}
            step="1"
            value={low_stock_threshold || ""}
            onChange={(e) => setT(+e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Vous pourrez définir la recette (matières nécessaires) depuis la fiche produit.
      </p>
      <button
        disabled={submitting}
        className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-60"
      >
        Créer le produit
      </button>
    </form>
  );
}

function RecipeEditor({ product }: { product: Product }) {
  const { data: materials = [] } = useRawMaterials();
  const { data: recipe = [] } = useRecipe(product.id);
  const upsert = useUpsertRecipeLine();
  const del = useDeleteRecipeLine();

  // Lignes locales : { id?: existant, raw_material_id }
  type Line = { id?: string; raw_material_id: string };
  const [lines, setLines] = useState<Line[]>([{ raw_material_id: "" }]);
  const [dirty, setDirty] = useState(false);

  // Hydrate depuis la recette existante quand elle arrive/change
  useMemo(() => {
    if (recipe.length > 0) {
      setLines(recipe.map((r) => ({ id: r.id, raw_material_id: r.raw_material_id })));
    } else {
      setLines([{ raw_material_id: "" }]);
    }
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.length, product.id]);

  const hasExisting = recipe.length > 0;
  const filled = lines.filter((l) => l.raw_material_id);
  const firstOk = !!lines[0]?.raw_material_id;
  const hasDup = new Set(filled.map((l) => l.raw_material_id)).size !== filled.length;

  function update(idx: number, v: string) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, raw_material_id: v } : l)));
    setDirty(true);
  }
  function addLine() {
    setLines([...lines, { raw_material_id: "" }]);
    setDirty(true);
  }
  function removeLine(idx: number) {
    if (lines.length === 1) setLines([{ raw_material_id: "" }]);
    else setLines(lines.filter((_, i) => i !== idx));
    setDirty(true);
  }

  async function save() {
    if (!firstOk || hasDup) return;
    // Supprimer les lignes retirées
    const keptIds = new Set(filled.map((l) => l.id).filter(Boolean) as string[]);
    for (const r of recipe) {
      if (!keptIds.has(r.id)) {
        await new Promise<void>((resolve) => del.mutate(r.id, { onSettled: () => resolve() }));
      }
    }
    // Upsert des lignes conservées / ajoutées (quantity_per_unit = 0, à définir en fournée)
    for (const l of filled) {
      await new Promise<void>((resolve) =>
        upsert.mutate(
          {
            bakery_id: product.bakery_id,
            product_id: product.id,
            raw_material_id: l.raw_material_id,
            quantity_per_unit: 0,
          },
          { onSettled: () => resolve() }
        )
      );
    }
    setDirty(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ajoutez les ingrédients nécessaires à la préparation de ce produit.
      </p>

      <div className="space-y-2">
        {lines.map((l, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <select
              value={l.raw_material_id}
              onChange={(e) => update(idx, e.target.value)}
              className={inputCls}
              required={idx === 0}
            >
              <option value="">
                {idx === 0 ? "— Matière première (obligatoire) —" : "— Matière première (optionnel) —"}
              </option>
              {materials
                .filter(
                  (m) =>
                    m.id === l.raw_material_id ||
                    !lines.some((x, k) => k !== idx && x.raw_material_id === m.id)
                )
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => removeLine(idx)}
              className="rounded-lg p-2 hover:bg-secondary"
              aria-label="Retirer"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addLine}
        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
      >
        <Plus className="h-3 w-3" /> Ajouter un ingrédient
      </button>

      {hasDup && (
        <p className="text-xs text-destructive">Une même matière est ajoutée plusieurs fois.</p>
      )}

      <p className="text-[11px] text-muted-foreground italic">
        Les quantités seront précisées lors de chaque fournée.
      </p>

      <button
        type="button"
        onClick={save}
        disabled={!firstOk || hasDup || upsert.isPending || del.isPending || (!dirty && hasExisting)}
        className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-50"
      >
        {upsert.isPending || del.isPending
          ? "Enregistrement…"
          : hasExisting
            ? "Modifier la recette"
            : "Enregistrer la recette"}
      </button>
    </div>
  );
}
