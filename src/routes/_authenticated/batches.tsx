import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useBakery, useBatches } from "@/lib/queries";
import { formatDateTime, formatMoney, formatQty, UNIT_LABEL } from "@/lib/format";
import { Plus, Flame } from "lucide-react";
import { Modal } from "@/components/Modal";
import { BatchForm } from "@/components/BatchForm";

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
          <p className="mt-1 text-sm text-muted-foreground">
            Saisissez matières consommées et quantités produites.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
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
              <div className="min-w-0">
                <h3 className="font-display text-lg truncate">{b.name}</h3>
                <p className="text-xs text-muted-foreground">{formatDateTime(b.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Coût matière
                </p>
                <p className="font-display text-lg">{formatMoney(b.total_material_cost)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Consommations
                </p>
                <ul className="text-sm space-y-1">
                  {b.batch_consumptions.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2">
                      <span className="truncate">{c.raw_materials?.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatQty(c.quantity_used, UNIT_LABEL[c.raw_materials?.unit ?? "unite"])} ·{" "}
                        {formatMoney(c.line_cost)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Production
                </p>
                <ul className="text-sm space-y-1">
                  {b.batch_outputs.map((o) => (
                    <li key={o.id} className="flex justify-between gap-2">
                      <span className="truncate">{o.products?.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatQty(o.quantity_produced, UNIT_LABEL[o.products?.unit ?? "unite"])}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNew && bakery && (
        <Modal title="Nouvelle fournée" onClose={() => setShowNew(false)} size="lg">
          <BatchForm bakeryId={bakery.id} onDone={() => setShowNew(false)} />
        </Modal>
      )}
    </div>
  );
}
