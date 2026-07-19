import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBakery, useBatches, useBatchTemplates, useCreateBatch, useProducts, useRawMaterials } from "@/lib/queries";
import { formatDateTime, formatMoney, formatQty, UNIT_LABEL } from "@/lib/format";
import { Plus, Flame, Trash2 } from "lucide-react";
import { Modal, Field, inputCls } from "./raw-materials";

export const Route = createFileRoute("/_authenticated/batches")({ component: BatchesPage });

function BatchesPage() {
  const { data: bakery } = useBakery();
  const { data: batches = [] } = useBatches(50);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Fournées</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Production du fournil</h1>
          <p className="mt-1 text-sm text-muted-foreground">Saisissez matières consommées et quantités produites.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
          <Plus className="h-4 w-4" /> Nouvelle fournée
        </button>
      </div>

      <div className="space-y-3">
        {batches.length === 0 && (
          <div className="card-elegant p-10 text-center text-sm text-muted-foreground">
            <Flame className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Aucune fournée enregistrée pour le moment.
          </div>
        )}
        {batches.map((b) => (
          <div key={b.id} className="card-elegant p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg">{b.name}</h3>
                <p className="text-xs text-muted-foreground">{formatDateTime(b.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Coût matière</p>
                <p className="font-display text-lg">{formatMoney(b.total_material_cost)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Consommations</p>
                <ul className="text-sm space-y-1">
                  {b.batch_consumptions.map((c) => (
                    <li key={c.id} className="flex justify-between">
                      <span>{c.raw_materials?.name}</span>
                      <span className="text-muted-foreground">{formatQty(c.quantity_used, UNIT_LABEL[c.raw_materials?.unit ?? "unite"])} · {formatMoney(c.line_cost)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Production</p>
                <ul className="text-sm space-y-1">
                  {b.batch_outputs.map((o) => (
                    <li key={o.id} className="flex justify-between">
                      <span>{o.products?.name}</span>
                      <span className="text-muted-foreground">{formatQty(o.quantity_produced, UNIT_LABEL[o.products?.unit ?? "unite"])}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNew && bakery && <NewBatchModal bakeryId={bakery.id} onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NewBatchModal({ bakeryId, onClose }: { bakeryId: string; onClose: () => void }) {
  const { data: templates = [] } = useBatchTemplates();
  const { data: materials = [] } = useRawMaterials();
  const { data: products = [] } = useProducts();
  const create = useCreateBatch();

  const [name, setName] = useState(`Fournée ${new Date().toLocaleDateString("fr-FR")}`);
  const [tplId, setTplId] = useState("");
  const [notes, setNotes] = useState("");
  const [cons, setCons] = useState<{ raw_material_id: string; quantity_used: number }[]>([]);
  const [outs, setOuts] = useState<{ product_id: string; quantity_produced: number }[]>([]);

  function applyTemplate(id: string) {
    setTplId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setOuts(tpl.batch_template_items.map((i) => ({ product_id: i.product_id, planned_quantity: i.planned_quantity } as any)).map((i: any) => ({ product_id: i.product_id, quantity_produced: i.planned_quantity })));
  }

  const totalCostPreview = useMemo(
    () => cons.reduce((s, c) => {
      const m = materials.find((x) => x.id === c.raw_material_id);
      return s + (m ? m.avg_cost * c.quantity_used : 0);
    }, 0),
    [cons, materials]
  );

  function submit() {
    if (!name || cons.length === 0 || outs.length === 0) return;
    create.mutate({ bakery_id: bakeryId, name, template_id: tplId || null, notes: notes || null, consumptions: cons, outputs: outs }, { onSuccess: onClose });
  }

  return (
    <Modal title="Nouvelle fournée" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nom"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
        <Field label="Modèle (optionnel)">
          <select value={tplId} onChange={(e) => applyTemplate(e.target.value)} className={inputCls}>
            <option value="">— aucun —</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>

        <SectionEditor
          title="Consommations de matières"
          options={materials.map((m) => ({ id: m.id, label: `${m.name} (stock ${formatQty(m.stock, UNIT_LABEL[m.unit])})`, unit: UNIT_LABEL[m.unit] }))}
          items={cons}
          itemKey="raw_material_id"
          qtyKey="quantity_used"
          onChange={setCons}
        />

        <SectionEditor
          title="Production (quantités obtenues)"
          options={products.map((p) => ({ id: p.id, label: p.name, unit: UNIT_LABEL[p.unit] }))}
          items={outs}
          itemKey="product_id"
          qtyKey="quantity_produced"
          onChange={setOuts}
        />

        <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} /></Field>

        <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">Coût matière estimé : <strong>{formatMoney(totalCostPreview)}</strong></div>

        <button onClick={submit} disabled={create.isPending || cons.length === 0 || outs.length === 0} className="w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground disabled:opacity-60">
          Enregistrer la fournée
        </button>
      </div>
    </Modal>
  );
}

function SectionEditor({ title, options, items, itemKey, qtyKey, onChange }: { title: string; options: { id: string; label: string; unit: string }[]; items: any[]; itemKey: string; qtyKey: string; onChange: (v: any[]) => void }) {
  const [id, setId] = useState("");
  const [qty, setQty] = useState(0);
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{title}</p>
      <div className="rounded-xl border border-border divide-y">
        {items.length === 0 && <p className="p-3 text-xs text-muted-foreground">Aucune ligne.</p>}
        {items.map((it, idx) => {
          const o = options.find((x) => x.id === it[itemKey]);
          return (
            <div key={idx} className="flex items-center justify-between p-2 text-sm">
              <span className="truncate">{o?.label ?? "—"}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">{formatQty(it[qtyKey], o?.unit)}</span>
                <button onClick={() => onChange(items.filter((_, k) => k !== idx))} className="rounded p-1 hover:bg-secondary"><Trash2 className="h-4 w-4 text-destructive" /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <select value={id} onChange={(e) => setId(e.target.value)} className={inputCls}>
          <option value="">— choisir —</option>
          {options.filter((o) => !items.find((it) => it[itemKey] === o.id)).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <input type="number" min={0} step="0.01" value={qty} onChange={(e) => setQty(+e.target.value)} className={inputCls + " w-28"} placeholder="Qté" />
        <button type="button" disabled={!id || qty <= 0} onClick={() => { onChange([...items, { [itemKey]: id, [qtyKey]: qty }]); setId(""); setQty(0); }} className="rounded-xl bg-accent px-3 py-2.5 text-sm text-accent-foreground disabled:opacity-50">Ajouter</button>
      </div>
    </div>
  );
}
