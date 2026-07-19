import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useProducts, useAddMovement, formatQty } from "@/lib/inventory";
import { TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/movements")({
  component: MovementsPage,
});

function MovementsPage() {
  const { data: products = [] } = useProducts();
  const add = useAddMovement();
  const [type, setType] = useState<"in" | "out">("in");
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState("");

  const selected = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return toast.error("Choisissez un produit");
    if (quantity <= 0) return toast.error("Quantité invalide");
    try {
      await add.mutateAsync({ product_id: productId, type, quantity, note });
      toast.success(type === "in" ? "Entrée enregistrée" : "Sortie enregistrée");
      setQuantity(1); setNote("");
    } catch (e: any) { toast.error(e.message ?? "Erreur"); }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Journal du fournil</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Mouvements de stock</h1>
        <p className="mt-2 text-muted-foreground">Enregistrez chaque entrée et sortie en un clin d'œil.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={submit} className="card-elegant grain p-6 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setType("in")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${type === "in" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:bg-secondary"}`}>
              <TrendingUp className="h-4 w-4" /> Entrée
            </button>
            <button type="button" onClick={() => setType("out")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${type === "out" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
              <TrendingDown className="h-4 w-4" /> Sortie
            </button>
          </div>

          <label className="block">
            <span className="text-xs text-muted-foreground">Produit</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm">
              <option value="">— Sélectionner —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Quantité {selected ? `(${selected.unit})` : ""}</span>
              <input type="number" min={0} step="0.01" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} className="mt-1 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Note</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optionnel" className="mt-1 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm" />
            </label>
          </div>

          <button disabled={add.isPending} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60">
            {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </form>

        <aside className="card-elegant grain p-6">
          <h2 className="font-display text-xl">Aperçu</h2>
          {selected ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">{selected.category}</p>
              <p className="font-display text-3xl">{selected.name}</p>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Stock actuel</p>
                <p className="mt-1 font-display text-2xl">{formatQty(selected.quantity, selected.unit)}</p>
                {type === "out" && quantity > selected.quantity && (
                  <p className="mt-2 text-xs text-destructive">La sortie dépasse le stock — celui-ci sera ramené à 0.</p>
                )}
                {type && quantity > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Après opération : <span className="text-foreground">{formatQty(Math.max(0, selected.quantity + (type === "in" ? quantity : -quantity)), selected.unit)}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Sélectionnez un produit pour voir l'aperçu.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
