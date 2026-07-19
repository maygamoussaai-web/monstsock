import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLedger } from "@/lib/queries";
import { formatDateTime, formatMoney, formatQty, UNIT_LABEL } from "@/lib/format";
import { History, ArrowDownRight, ArrowUpRight, ShoppingBag, Flame, Package2, AlertTriangle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({ component: HistoryPage });

const KIND_META: Record<string, { label: string; icon: any; tone: string }> = {
  purchase:      { label: "Réappro",     icon: Package2,    tone: "text-accent" },
  batch_consume: { label: "Fournée −",   icon: Flame,       tone: "text-destructive" },
  batch_produce: { label: "Fournée +",   icon: Flame,       tone: "text-accent" },
  sale:          { label: "Vente",       icon: ShoppingBag, tone: "text-accent" },
  loss:          { label: "Invendu",     icon: AlertTriangle, tone: "text-destructive" },
  adjustment:    { label: "Ajustement",  icon: ShieldCheck, tone: "text-muted-foreground" },
};

function HistoryPage() {
  const { data: ledger = [] } = useLedger(500);
  const [kind, setKind] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return ledger.filter((l) => {
      if (kind !== "all" && l.kind !== kind) return false;
      if (q) {
        const name = (l.raw_materials?.name ?? l.products?.name ?? "") + " " + (l.note ?? "");
        if (!name.toLowerCase().includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [ledger, kind, q]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Historique</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Journal des mouvements</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chaque entrée est immuable et horodatée — traçabilité totale.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-full border border-border bg-card p-1 overflow-x-auto">
          {["all", ...Object.keys(KIND_META)].map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`px-3 py-1.5 text-xs whitespace-nowrap rounded-full transition-colors ${kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {k === "all" ? "Tout" : KIND_META[k].label}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer…" className="rounded-full border border-input bg-card px-4 py-2 text-sm outline-none focus:border-accent max-w-xs flex-1" />
      </div>

      <div className="card-elegant overflow-hidden">
        <div className="divide-y divide-border">
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <History className="mx-auto mb-2 h-6 w-6 opacity-40" />
              Aucun mouvement pour ces filtres.
            </div>
          )}
          {filtered.map((l) => {
            const meta = KIND_META[l.kind] ?? KIND_META.adjustment;
            const Icon = meta.icon;
            const target = l.raw_materials?.name ?? l.products?.name ?? "—";
            const unit = l.raw_materials?.unit ?? l.products?.unit;
            const positive = l.delta_quantity >= 0;
            return (
              <div key={l.id} className="flex items-center gap-4 px-4 py-3">
                <div className={`grid h-9 w-9 place-items-center rounded-full bg-secondary ${meta.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm"><span className="font-medium">{target}</span> <span className="text-muted-foreground text-xs">· {meta.label}</span></p>
                  <p className="text-xs text-muted-foreground truncate">{l.note || "—"} · {formatDateTime(l.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium flex items-center justify-end gap-1 ${positive ? "text-accent" : "text-destructive"}`}>
                    {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {formatQty(Math.abs(l.delta_quantity), unit ? UNIT_LABEL[unit] : undefined)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatMoney(Math.abs(l.delta_value))}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
