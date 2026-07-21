import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useBakery,
  useBatchTemplates,
  useCreateBatchTemplate,
  useDeleteBatchTemplate,
  useProducts,
  useRawMaterials,
} from "@/lib/queries";
import { formatQty, UNIT_LABEL } from "@/lib/format";
import { Plus, Layers, Trash2 } from "lucide-react";
import { Modal, Field, inputCls } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/batch-templates")({
  component: TemplatesPage,
});

function TemplatesPage() {
  const { data: bakery } = useBakery();
  const { data: templates = [] } = useBatchTemplates();
  const [showNew, setShowNew] = useState(false);
  const del = useDeleteBatchTemplate();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Modèles de fournée
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Vos fournées récurrentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Préparez des schémas de production réutilisables.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Nouveau modèle
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.length === 0 && (
          <div className="card-elegant p-10 text-center col-span-full text-sm text-muted-foreground">
            <Layers className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Aucun modèle. Créez-en un pour accélérer la saisie de vos fournées.
          </div>
        )}
        {templates.map((t) => (
          <div key={t.id} className="card-elegant p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display text-lg truncate">{t.name}</h3>
                {t.products && (
                  <p className="text-xs text-muted-foreground">
                    {t.products.name} ·{" "}
                    {formatQty(Number(t.planned_quantity ?? 0), UNIT_LABEL[t.products.unit as any])}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (confirm("Supprimer ce modèle ?")) del.mutate(t.id);
                }}
                className="rounded-lg p-1.5 hover:bg-secondary shrink-0"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {t.batch_template_ingredients.length === 0 && (
                <li className="text-xs text-muted-foreground">Aucun ingrédient</li>
              )}
              {t.batch_template_ingredients.map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span className="truncate">{i.raw_materials?.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatQty(Number(i.quantity), UNIT_LABEL[i.raw_materials?.unit ?? "unite"])}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {showNew && bakery && (
        <Modal title="Nouveau modèle de fournée" onClose={() => setShowNew(false)} size="lg">
          <TemplateForm bakeryId={bakery.id} onDone={() => setShowNew(false)} />
        </Modal>
      )}
    </div>
  );
}

function TemplateForm({ bakeryId, onDone }: { bakeryId: string; onDone: () => void }) {
  const { data: products = [] } = useProducts();
  const { data: materials = [] } = useRawMaterials();
  const create = useCreateBatchTemplate();

  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [plannedQty, setPlannedQty] = useState<number>(0);
  const [ings, setIngs] = useState<{ raw_material_id: string; quantity: number }[]>([
    { raw_material_id: "", quantity: 0 },
  ]);

  const filled = ings.filter((i) => i.raw_material_id && i.quantity > 0);
  const firstOk = ings[0]?.raw_material_id && ings[0]?.quantity > 0;
  const canSubmit = !!name && !!productId && plannedQty > 0 && firstOk && !create.isPending;

  function update(idx: number, patch: Partial<{ raw_material_id: string; quantity: number }>) {
    setIngs(ings.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function add() {
    setIngs([...ings, { raw_material_id: "", quantity: 0 }]);
  }
  function remove(idx: number) {
    if (ings.length === 1) setIngs([{ raw_material_id: "", quantity: 0 }]);
    else setIngs(ings.filter((_, i) => i !== idx));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    create.mutate(
      {
        bakery_id: bakeryId,
        name,
        product_id: productId,
        planned_quantity: plannedQty,
        ingredients: filled,
      },
      { onSuccess: onDone }
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nom du modèle">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Ex : Fournée du matin"
        />
      </Field>

      <Field label="Produit">
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

      <Field label="Quantité à produire">
        <input
          type="number"
          required
          min={0.01}
          step="0.01"
          value={plannedQty || ""}
          onChange={(e) => setPlannedQty(+e.target.value)}
          className={inputCls}
          placeholder="Ex : 100"
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Ingrédients</p>
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Plus className="h-3 w-3" /> Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {ings.map((it, idx) => {
            const m = materials.find((x) => x.id === it.raw_material_id);
            return (
              <div key={idx} className="rounded-xl border border-border p-3 bg-background/40">
                <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                  <select
                    value={it.raw_material_id}
                    onChange={(e) => update(idx, { raw_material_id: e.target.value })}
                    className={inputCls}
                    required={idx === 0}
                  >
                    <option value="">
                      {idx === 0 ? "— Matière (obligatoire) —" : "— Matière —"}
                    </option>
                    {materials
                      .filter(
                        (mm) =>
                          mm.id === it.raw_material_id ||
                          !ings.some((x, k) => k !== idx && x.raw_material_id === mm.id)
                      )
                      .map((mm) => (
                        <option key={mm.id} value={mm.id}>
                          {mm.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="rounded-lg p-2 hover:bg-secondary"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={it.quantity || ""}
                  onChange={(e) => update(idx, { quantity: +e.target.value })}
                  className={inputCls + " mt-2"}
                  placeholder={m ? `Quantité en ${UNIT_LABEL[m.unit]}` : "Quantité"}
                  required={idx === 0}
                />
              </div>
            );
          })}
        </div>
      </div>

      <button
        disabled={!canSubmit}
        className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-50"
      >
        {create.isPending ? "Enregistrement…" : "Enregistrer le modèle"}
      </button>
    </form>
  );
}
