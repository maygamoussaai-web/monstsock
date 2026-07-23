import { useMemo, useState, useEffect } from "react";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import { Field, inputCls } from "@/components/Modal";
import {
  useBatchTemplates,
  useProducts,
  useRawMaterials,
  useCreateBatch,
  useRecipe,
} from "@/lib/queries";
import { formatQty, UNIT_LABEL } from "@/lib/format";

type Ingredient = { raw_material_id: string; quantity_used: number };

export function BatchForm({
  bakeryId,
  initialProductId,
  onDone,
}: {
  bakeryId: string;
  initialProductId?: string;
  onDone: () => void;
}) {
  const { data: templates = [] } = useBatchTemplates();
  const { data: products = [] } = useProducts();
  const { data: materials = [] } = useRawMaterials();
  const create = useCreateBatch();

  const [templateId, setTemplateId] = useState("");
  const [productId, setProductId] = useState(initialProductId ?? "");
  const [quantityProduced, setQuantityProduced] = useState<number>(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { raw_material_id: "", quantity_used: 0 },
  ]);
  const [notes, setNotes] = useState("");

  const product = products.find((p) => p.id === productId);
  const availableMaterials = useMemo(() => materials.filter((m) => m.stock > 0), [materials]);

  // Applique un modèle : préremplit produit, quantité et ingrédients
  function applyTemplate(id: string) {
    setTemplateId(id);
    if (!id) return;
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    if (tpl.product_id) setProductId(tpl.product_id);
    if (tpl.planned_quantity) setQuantityProduced(Number(tpl.planned_quantity));
    if (tpl.batch_template_ingredients?.length) {
      setIngredients(
        tpl.batch_template_ingredients.map((i) => ({
          raw_material_id: i.raw_material_id,
          quantity_used: Number(i.quantity),
        }))
      );
    }
  }

  useEffect(() => {
    if (initialProductId) setProductId(initialProductId);
  }, [initialProductId]);

  function updateIngredient(idx: number, patch: Partial<Ingredient>) {
    setIngredients(ingredients.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addIngredient() {
    setIngredients([...ingredients, { raw_material_id: "", quantity_used: 0 }]);
  }
  function removeIngredient(idx: number) {
    if (ingredients.length === 1) {
      setIngredients([{ raw_material_id: "", quantity_used: 0 }]);
    } else {
      setIngredients(ingredients.filter((_, i) => i !== idx));
    }
  }

  // Validation des ingrédients
  const filledIngredients = ingredients.filter(
    (it) => it.raw_material_id && it.quantity_used > 0
  );
  const firstIsFilled = ingredients[0]?.raw_material_id && ingredients[0]?.quantity_used > 0;

  const stockErrors = filledIngredients
    .map((it) => {
      const m = materials.find((x) => x.id === it.raw_material_id);
      if (!m) return null;
      if (it.quantity_used > m.stock) {
        return `Stock insuffisant pour ${m.name} : disponible ${formatQty(m.stock, UNIT_LABEL[m.unit])}, demandé ${formatQty(it.quantity_used, UNIT_LABEL[m.unit])}.`;
      }
      return null;
    })
    .filter(Boolean) as string[];

  const duplicate =
    new Set(filledIngredients.map((i) => i.raw_material_id)).size !== filledIngredients.length;

  const canSubmit =
    !!productId &&
    quantityProduced > 0 &&
    firstIsFilled &&
    stockErrors.length === 0 &&
    !duplicate &&
    !create.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    create.mutate(
      {
        bakery_id: bakeryId,
        name: `Fournée ${product?.name ?? ""} — ${new Date().toLocaleDateString("fr-FR")}`,
        template_id: templateId || null,
        notes: notes || null,
        consumptions: filledIngredients,
        outputs: [{ product_id: productId, quantity_produced: quantityProduced }],
      },
      { onSuccess: onDone }
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Modèle (optionnel)">
        <select
          value={templateId}
          onChange={(e) => applyTemplate(e.target.value)}
          className={inputCls}
        >
          <option value="">— Aucun —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Produit à fabriquer">
        <select
          required
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
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
        <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm flex justify-between">
          <span className="text-muted-foreground">Stock actuel</span>
          <strong>{formatQty(product.stock, UNIT_LABEL[product.unit])}</strong>
        </div>
      )}

      <Field label="Quantité à produire" hint="Nombre d'unités produites par cette fournée">
        <input
          type="number"
          required
          min={0.01}
          step="0.01"
          value={quantityProduced || ""}
          onChange={(e) => setQuantityProduced(+e.target.value)}
          className={inputCls}
          placeholder="Ex : 100"
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Ingrédients consommés
          </p>
          <button
            type="button"
            onClick={addIngredient}
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Plus className="h-3 w-3" /> Ajouter
          </button>
        </div>

        <div className="space-y-2">
          {ingredients.map((it, idx) => {
            const m = materials.find((x) => x.id === it.raw_material_id);
            const overStock = m && it.quantity_used > m.stock;
            return (
              <div key={idx} className="rounded-xl border border-border p-3 bg-background/40">
                <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                  <select
                    value={it.raw_material_id}
                    onChange={(e) => updateIngredient(idx, { raw_material_id: e.target.value })}
                    className={inputCls}
                    required={idx === 0}
                  >
                    <option value="">
                      {idx === 0 ? "— Matière première (obligatoire) —" : "— Matière première —"}
                    </option>
                    {availableMaterials
                      .filter(
                        (mat) =>
                          mat.id === it.raw_material_id ||
                          !ingredients.some((x, k) => k !== idx && x.raw_material_id === mat.id)
                      )
                      .map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} — {formatQty(mat.stock, UNIT_LABEL[mat.unit])} dispo
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    className="rounded-lg p-2 hover:bg-secondary"
                    aria-label="Retirer"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.0001"
                    value={it.quantity_used || ""}
                    onChange={(e) => updateIngredient(idx, { quantity_used: +e.target.value })}
                    className={inputCls + (overStock ? " border-destructive" : "")}
                    placeholder={m ? `Quantité en ${UNIT_LABEL[m.unit]}` : "Quantité"}
                    required={idx === 0}
                  />
                </div>
                {overStock && (
                  <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Dépasse le stock disponible ({formatQty(m!.stock, UNIT_LABEL[m!.unit])}).
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {duplicate && (
          <p className="mt-2 text-xs text-destructive">
            Une même matière est ajoutée plusieurs fois.
          </p>
        )}
      </div>

      <Field label="Notes (optionnel)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputCls}
        />
      </Field>

      {stockErrors.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
          {stockErrors.map((m, i) => (
            <p key={i}>{m}</p>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-50"
      >
        {create.isPending ? "Enregistrement…" : "Enregistrer la fournée"}
      </button>
    </form>
  );
}
