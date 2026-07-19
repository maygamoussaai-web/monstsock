import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMovements, useProducts, formatQty } from "@/lib/inventory";
import { TrendingDown, TrendingUp, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { data: movements = [] } = useMovements();
  const { data: products = [] } = useProducts();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | "in" | "out">("");

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (type && m.type !== type) return false;
      if (q) {
        const p = productMap[m.product_id];
        const hay = `${p?.name ?? ""} ${m.note ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [movements, productMap, q, type]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Traçabilité</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Historique</h1>
        <p className="mt-2 text-muted-foreground">Tous les mouvements, du plus récent au plus ancien.</p>
      </div>

      <div className="card-elegant p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (produit ou note)…"
            className="w-full rounded-xl border border-input bg-background/60 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm">
          <option value="">Tous types</option>
          <option value="in">Entrées</option>
          <option value="out">Sorties</option>
        </select>
      </div>

      <div className="card-elegant grain overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">Aucun mouvement.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((m) => {
              const p = productMap[m.product_id];
              return (
                <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`grid h-9 w-9 place-items-center rounded-full ${m.type === "in" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"}`}>
                    {m.type === "in" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p?.name ?? "Produit supprimé"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("fr-FR")}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                  </div>
                  <p className={`font-display text-lg ${m.type === "in" ? "text-accent" : "text-primary"}`}>
                    {m.type === "in" ? "+" : "−"}{formatQty(m.quantity, p?.unit ?? "")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
