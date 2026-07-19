import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBakery, useProducts, useCreateProduct, useDeleteProduct, useRawMaterials, useRecipe, useUpsertRecipeLine, useDeleteRecipeLine, useUpdateProduct } from "@/lib/queries";
import { formatMoney, formatQty, PRODUCT_UNITS, UNIT_LABEL } from "@/lib/format";
import { Plus, Search, Croissant, Trash2, ChefHat } from "lucide-react";
import { Modal, Field, inputCls } from "./raw-materials";

export const Route = createFileRoute("/_authenticated/products")({ component: ProductsPage });

function ProductsPage() {
  const { data: bakery } = useBakery();
  const { data: products = [] } = useProducts();
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [recipeFor, setRecipeFor] = useState<string | null>(null);
  const create = useCreateProduct();
  const del = useDeleteProduct();

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [products, q]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Produits fabriqués</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Baguettes, croissants, pains…</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recette, prix de vente, coût matière et stock.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
          <Plus className="h-4 w-4" /> Nouveau produit
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
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Croissant className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Aucun produit fabriqué. Créez-en un pour commencer.
                </td></tr>
              )}
              {filtered.map((p) => {
                const margin = (p.sale_price ?? 0) - (p.material_cost ?? 0);
                const low = p.stock <= p.low_stock_threshold;
                return (
                  <tr key={p.id} className={low ? "bg-destructive/5" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{UNIT_LABEL[p.unit]}</p>
                    </td>
                    <td className={`px-4 py-3 text-right ${low ? "text-destructive" : ""}`}>{formatQty(p.stock, UNIT_LABEL[p.unit])}</td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">{formatMoney(p.sale_price)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-muted-foreground">{formatMoney(p.material_cost)}</td>
                    <td className={`px-4 py-3 text-right ${margin < 0 ? "text-destructive" : "text-accent"}`}>{formatMoney(margin)}</td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setRecipeFor(p.id)} className="rounded-lg p-2 hover:bg-secondary" title="Recette">
                          <ChefHat className="h-4 w-4 text-accent" />
                        </button>
                        <button onClick={() => { if (confirm(`Supprimer « ${p.name} » ?`)) del.mutate(p.id); }} className="rounded-lg p-2 hover:bg-secondary" title="Supprimer">
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
        <Modal title="Nouveau produit" onClose={() => setShowNew(false)}>
          <ProductForm submitting={create.isPending} onSubmit={(v) => create.mutate({ bakery_id: bakery.id, ...v }, { onSuccess: () => setShowNew(false) })} />
        </Modal>
      )}

      {recipeFor && bakery && (
        <Modal title="Recette" onClose={() => setRecipeFor(null)}>
          <RecipeEditor bakeryId={bakery.id} productId={recipeFor} product={products.find(p => p.id === recipeFor)!} />
        </Modal>
      )}
    </div>
  );
}

function ProductForm({ onSubmit, submitting }: { onSubmit: (v: any) => void; submitting: boolean }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<typeof PRODUCT_UNITS[number]>("unite");
  const [sale_price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [low_stock_threshold, setT] = useState(0);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, unit, sale_price, stock, low_stock_threshold }); }} className="space-y-3">
      <Field label="Nom"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Baguette tradition" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unité de vente">
          <select value={unit} onChange={(e) => setUnit(e.target.value as any)} className={inputCls}>
            {PRODUCT_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
          </select>
        </Field>
        <Field label="Prix de vente (FCFA)"><input type="number" min={0} step="1" value={sale_price} onChange={(e) => setPrice(+e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stock initial"><input type="number" min={0} step="1" value={stock} onChange={(e) => setStock(+e.target.value)} className={inputCls} /></Field>
        <Field label="Seuil bas"><input type="number" min={0} step="1" value={low_stock_threshold} onChange={(e) => setT(+e.target.value)} className={inputCls} /></Field>
      </div>
      <p className="text-xs text-muted-foreground">Vous pourrez définir la recette (matières nécessaires) après création.</p>
      <button disabled={submitting} className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-60">Créer le produit</button>
    </form>
  );
}

function RecipeEditor({ bakeryId, productId, product }: { bakeryId: string; productId: string; product: any }) {
  const { data: materials = [] } = useRawMaterials();
  const { data: recipe = [] } = useRecipe(productId);
  const upsert = useUpsertRecipeLine();
  const del = useDeleteRecipeLine();
  const updateProduct = useUpdateProduct();

  const [matId, setMatId] = useState("");
  const [qty, setQty] = useState(0);
  const [salePrice, setSalePrice] = useState(product.sale_price);

  const totalCost = recipe.reduce((s, r) => s + r.quantity_per_unit * (r.raw_materials?.avg_cost ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
        <p className="font-medium">{product.name}</p>
        <p className="text-xs text-muted-foreground">Coût matière calculé : <strong>{formatMoney(totalCost)}</strong> · Marge : <strong>{formatMoney((salePrice ?? 0) - totalCost)}</strong></p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Ingrédients par unité produite</p>
        <div className="divide-y divide-border rounded-xl border border-border">
          {recipe.length === 0 && <p className="p-3 text-xs text-muted-foreground">Aucun ingrédient. Ajoutez-en ci-dessous.</p>}
          {recipe.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate">{r.raw_materials?.name}</p>
                <p className="text-xs text-muted-foreground">{formatQty(r.quantity_per_unit, UNIT_LABEL[r.raw_materials?.unit ?? "unite"])} · {formatMoney(r.quantity_per_unit * (r.raw_materials?.avg_cost ?? 0))}</p>
              </div>
              <button onClick={() => del.mutate(r.id)} className="rounded-lg p-2 hover:bg-secondary"><Trash2 className="h-4 w-4 text-destructive" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <Field label="Matière">
          <select value={matId} onChange={(e) => setMatId(e.target.value)} className={inputCls}>
            <option value="">— choisir —</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({UNIT_LABEL[m.unit]})</option>)}
          </select>
        </Field>
        <Field label="Quantité / unité"><input type="number" min={0} step="0.0001" value={qty} onChange={(e) => setQty(+e.target.value)} className={inputCls + " w-32"} /></Field>
        <button
          disabled={!matId || qty <= 0 || upsert.isPending}
          onClick={() => upsert.mutate({ bakery_id: bakeryId, product_id: productId, raw_material_id: matId, quantity_per_unit: qty }, { onSuccess: () => { setMatId(""); setQty(0); } })}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm text-accent-foreground disabled:opacity-50"
        >Ajouter</button>
      </div>

      <div className="border-t pt-4">
        <Field label="Prix de vente (FCFA)">
          <input type="number" min={0} step="1" value={salePrice} onChange={(e) => setSalePrice(+e.target.value)} className={inputCls} />
        </Field>
        <button
          onClick={() => updateProduct.mutate({ id: productId, sale_price: salePrice })}
          className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm text-primary-foreground"
        >Enregistrer le prix</button>
      </div>
    </div>
  );
}
