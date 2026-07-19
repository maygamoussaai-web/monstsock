import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useProducts, useUpsertProduct, useDeleteProduct, CATEGORIES, UNITS, formatQty, type Product, type Unit } from "@/lib/inventory";
import { Plus, Search, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const { data: products = [], isLoading } = useProducts();
  const upsert = useUpsertProduct();
  const del = useDeleteProduct();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && p.category !== cat) return false;
      if (onlyLow && p.quantity > p.low_stock_threshold) return false;
      return true;
    });
  }, [products, q, cat, onlyLow]);

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(p: Product) { setEditing(p); setOpen(true); }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Inventaire</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Stock</h1>
          <p className="mt-2 text-muted-foreground">Consultez, filtrez et gérez vos produits.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:opacity-95">
          <Plus className="h-4 w-4" /> Nouveau produit
        </button>
      </div>

      <div className="card-elegant p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit…"
            className="w-full rounded-xl border border-input bg-background/60 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)}
          className="rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          Stock faible seulement
        </label>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="card-elegant grain p-12 text-center">
          <p className="font-display text-2xl">Rien à afficher</p>
          <p className="mt-2 text-muted-foreground">Ajoutez votre premier produit pour commencer.</p>
          <button onClick={openNew} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">
            <Plus className="h-4 w-4" /> Créer un produit
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => {
            const low = p.quantity <= p.low_stock_threshold;
            return (
              <article key={p.id} className="card-elegant card-elegant-hover grain p-5 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.category}</p>
                    <h3 className="font-display text-xl truncate">{p.name}</h3>
                  </div>
                  {low && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-accent">
                      <AlertTriangle className="h-3 w-3" /> Bas
                    </span>
                  )}
                </div>
                <p className="mt-4 font-display text-3xl">{formatQty(p.quantity, p.unit)}</p>
                <p className="text-xs text-muted-foreground">Seuil · {formatQty(p.low_stock_threshold, p.unit)}</p>
                {p.notes && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{p.notes}</p>}
                <div className="mt-5 flex items-center gap-2">
                  <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                  <button onClick={() => { if (confirm(`Supprimer « ${p.name} » ?`)) del.mutate(p.id, { onSuccess: () => toast.success("Supprimé") }); }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open && (
        <ProductDialog
          initial={editing}
          onClose={() => setOpen(false)}
          onSubmit={async (values) => {
            try {
              await upsert.mutateAsync({ ...(editing ? { id: editing.id } : {}), ...values });
              toast.success(editing ? "Produit mis à jour" : "Produit créé");
              setOpen(false);
            } catch (e: any) { toast.error(e.message ?? "Erreur"); }
          }}
        />
      )}
    </div>
  );
}

function ProductDialog({ initial, onClose, onSubmit }: {
  initial: Product | null;
  onClose: () => void;
  onSubmit: (values: { name: string; category: string; unit: Unit; quantity: number; low_stock_threshold: number; notes: string | null; }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [unit, setUnit] = useState<Unit>((initial?.unit as Unit) ?? "kg");
  const [quantity, setQuantity] = useState<number>(initial?.quantity ?? 0);
  const [threshold, setThreshold] = useState<number>(initial?.low_stock_threshold ?? 5);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-primary/40 backdrop-blur-sm p-4 animate-fade-up">
      <div className="card-elegant grain w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{initial ? "Modifier le produit" : "Nouveau produit"}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ name, category, unit, quantity: Number(quantity), low_stock_threshold: Number(threshold), notes: notes || null }); }}>
          <Field label="Nom">
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input-elegant" placeholder="Farine T65" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-elegant">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Unité">
              <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="input-elegant">
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantité initiale">
              <input type="number" min={0} step="0.01" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} className="input-elegant" />
            </Field>
            <Field label="Seuil d'alerte">
              <input type="number" min={0} step="0.01" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)} className="input-elegant" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-elegant resize-none" placeholder="Fournisseur, lot, etc." />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Annuler</button>
            <button type="submit" className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:opacity-95">
              {initial ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
        <style>{`.input-elegant{width:100%;border-radius:.75rem;border:1px solid var(--color-input);background:var(--color-background);padding:.65rem .85rem;font-size:.875rem;outline:none;transition:border-color .2s}.input-elegant:focus{border-color:var(--color-accent)}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
