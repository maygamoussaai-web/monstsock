import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useBakery, useBatchTemplates, useCreateBatchTemplate, useDeleteBatchTemplate, useProducts } from "@/lib/queries";
import { formatQty, UNIT_LABEL } from "@/lib/format";
import { Plus, Layers, Trash2 } from "lucide-react";
import { Modal, Field, inputCls } from "./raw-materials";

export const Route = createFileRoute("/_authenticated/batch-templates")({ component: TemplatesPage });

function TemplatesPage() {
  const { data: bakery } = useBakery();
  const { data: templates = [] } = useBatchTemplates();
  const { data: products = [] } = useProducts();
  const [showNew, setShowNew] = useState(false);
  const create = useCreateBatchTemplate();
  const del = useDeleteBatchTemplate();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Modèles de fournée</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Vos fournées récurrentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Préparez des schémas de production réutilisables.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
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
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg">{t.name}</h3>
              <button onClick={() => { if (confirm("Supprimer ce modèle ?")) del.mutate(t.id); }} className="rounded-lg p-1.5 hover:bg-secondary"><Trash2 className="h-4 w-4 text-destructive" /></button>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {t.batch_template_items.length === 0 && <li className="text-xs text-muted-foreground">Aucun produit prévu</li>}
              {t.batch_template_items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.products?.name}</span>
                  <span className="text-muted-foreground">{formatQty(i.planned_quantity, UNIT_LABEL[i.products?.unit ?? "unite"])}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {showNew && bakery && (
        <Modal title="Nouveau modèle de fournée" onClose={() => setShowNew(false)}>
          <TemplateForm products={products} submitting={create.isPending} onSubmit={(v) => create.mutate({ bakery_id: bakery.id, ...v }, { onSuccess: () => setShowNew(false) })} />
        </Modal>
      )}
    </div>
  );
}

function TemplateForm({ products, onSubmit, submitting }: { products: any[]; onSubmit: (v: any) => void; submitting: boolean }) {
  const [name, setName] = useState("");
  const [items, setItems] = useState<{ product_id: string; planned_quantity: number }[]>([]);
  const [pid, setPid] = useState("");
  const [pq, setPq] = useState(0);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, items }); }} className="space-y-3">
      <Field label="Nom du modèle"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Fournée du matin" /></Field>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Produits prévus</p>
        <div className="rounded-xl border border-border divide-y">
          {items.length === 0 && <p className="p-3 text-xs text-muted-foreground">Aucun produit ajouté.</p>}
          {items.map((i, idx) => {
            const p = products.find((x) => x.id === i.product_id);
            return (
              <div key={idx} className="flex items-center justify-between p-2 text-sm">
                <span>{p?.name} — {formatQty(i.planned_quantity, UNIT_LABEL[p?.unit ?? "unite"])}</span>
                <button type="button" onClick={() => setItems(items.filter((_, k) => k !== idx))} className="rounded p-1 hover:bg-secondary"><Trash2 className="h-4 w-4 text-destructive" /></button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <Field label="Produit">
            <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputCls}>
              <option value="">— choisir —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Quantité"><input type="number" min={0} step="1" value={pq} onChange={(e) => setPq(+e.target.value)} className={inputCls + " w-28"} /></Field>
          <button type="button" disabled={!pid || pq <= 0} onClick={() => { setItems([...items, { product_id: pid, planned_quantity: pq }]); setPid(""); setPq(0); }} className="rounded-xl bg-accent px-3 py-2.5 text-sm text-accent-foreground disabled:opacity-50">Ajouter</button>
        </div>
      </div>
      <button disabled={submitting || !name} className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-60">Créer le modèle</button>
    </form>
  );
}
